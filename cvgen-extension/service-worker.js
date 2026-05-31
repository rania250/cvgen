/**
 * CVGen Service Worker (background)
 * Point unique de contact avec l'API CVGen.
 * Les content scripts et le popup NE font jamais d'appels réseau directs.
 *
 * Placé à la racine de l'extension pour que importScripts() fonctionne
 * avec des chemins simples sans ambiguïté.
 */

importScripts(
  "utils/logger.js",
  "utils/storage.js",
  "utils/api-client.js",
  "utils/cdp-filler.js",
);

// ─── Dispatcher principal ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  handleMessage(message, sender)
    .then(function (response) {
      try {
        sendResponse(response);
      } catch (_) {
        // Le contexte sendResponse peut être collecté si le popup est fermé
      }
    })
    .catch(function (err) {
      Logger.error("Service worker — erreur non gérée", err);
      try {
        sendResponse({
          success: false,
          error: err.message || "Erreur inconnue",
        });
      } catch (_) {}
    });

  return true; // Indique une réponse asynchrone
});

async function handleMessage(message, sender) {
  Logger.debug("Message reçu: " + message.type);

  switch (message.type) {
    case "LOGIN":
      return handleLogin(message.payload);

    case "LOGOUT":
      return handleLogout();

    case "GET_PROFILE":
      return handleGetProfile();

    case "SYNC_PROFILE":
      return handleSyncProfile();

    case "GET_CACHED_PROFILE":
      return handleGetCachedProfile();

    case "GET_USER":
      return handleGetUser();

    case "AI_PREPARE":
      return handleAiPrepare(message.payload);

    case "FILL_CLOSED_SHADOW":
      return handleFillClosedShadow(message.payload, sender);

    case "FETCH_SR_POSTING":
      return handleFetchSrPosting(message.payload);

    case "EXEC_MAIN_SF":
      return handleExecMainSf(message.payload, sender);

    default:
      Logger.warn("Type de message inconnu: " + message.type);
      return {
        success: false,
        error: "Type de message inconnu: " + message.type,
      };
  }
}

// ─── Handlers ────────────────────────────────────────────────────────────────

/**
 * Convertit un fragment HTML en texte brut (pas de DOM dans le service worker).
 */
function htmlToText(html) {
  if (!html) return "";
  return html
    .replace(/<\s*(br|\/p|\/div|\/li|\/h[1-6])\s*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Récupère la description complète d'une offre SmartRecruiters via l'API
 * publique (la page de candidature ne contient que le titre).
 * payload : { companyId, postingId }
 */
async function handleFetchSrPosting(payload) {
  const companyId = payload && payload.companyId;
  const postingId = payload && payload.postingId;
  if (!companyId || !postingId) {
    return { success: false, error: "Identifiants SmartRecruiters manquants." };
  }
  const url =
    "https://api.smartrecruiters.com/v1/companies/" +
    encodeURIComponent(companyId) +
    "/postings/" +
    encodeURIComponent(postingId);
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return { success: false, error: "API SmartRecruiters HTTP " + resp.status };
    }
    const data = await resp.json();
    const sections = (data.jobAd && data.jobAd.sections) || {};
    const parts = [];
    ["companyDescription", "jobDescription", "qualifications", "additionalInformation"].forEach(
      function (key) {
        const sec = sections[key];
        if (sec && sec.text) {
          const t = htmlToText(sec.text);
          if (t) parts.push((sec.title ? sec.title + "\n" : "") + t);
        }
      },
    );
    const offerText = parts.join("\n\n");
    const company =
      (data.company && data.company.name) ||
      (data.creator && data.creator.name) ||
      companyId;
    Logger.log("Offre SmartRecruiters récupérée (" + offerText.length + " caractères).");
    return {
      success: true,
      title: data.name || "",
      company: company,
      location: data.location ? [data.location.city, data.location.country].filter(Boolean).join(", ") : "",
      offerText: offerText,
    };
  } catch (err) {
    Logger.warn("Échec récupération offre SmartRecruiters : " + err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Remplit les champs verrouillés dans un Shadow DOM "closed" (ex. SmartRecruiters)
 * via le protocole de débogage de Chrome (chrome.debugger / CDP).
 * payload : { fields: [{ formcontrolname, value }] }
 */
async function handleFillClosedShadow(payload, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (!tabId) {
    return { success: false, error: "Onglet introuvable (tabId manquant)." };
  }
  const fields = (payload && payload.fields) || [];
  if (!fields.length) {
    return { success: true, filled: [], failed: [] };
  }
  Logger.log("CDP — remplissage de " + fields.length + " champ(s) shadow fermé…");
  const result = await CdpFiller.fillFields(tabId, fields);
  Logger.log(
    "CDP — résultat : " +
      (result.filled || []).length +
      " rempli(s), " +
      (result.failed || []).length +
      " échec(s)" +
      (result.error ? " (" + result.error + ")" : ""),
  );
  (result.details || []).forEach(function (d) {
    Logger.log("CDP détail — " + d);
  });
  return result;
}

/**
 * Exécute une opération SuccessFactors dans le MAIN world via chrome.scripting,
 * qui N'EST PAS soumis à la CSP de la page (contrairement à l'injection d'un
 * <script> inline, bloquée par les CSP strictes type Capgemini).
 *
 * On n'utilise jamais eval : pour déclencher les handlers SAP/juic, on appelle
 * directement la propriété handler de l'élément (el.onclick / el.onblur / ...).
 *
 * payload : { action, id?, btnId?, token?, value? }
 */
async function handleExecMainSf(payload, sender) {
  const tabId = sender && sender.tab && sender.tab.id;
  if (!tabId) {
    return { success: false, error: "Onglet introuvable (tabId manquant)." };
  }
  const frameId = sender && typeof sender.frameId === "number" ? sender.frameId : 0;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId, frameIds: [frameId] },
      world: "MAIN",
      func: SF_MAIN_FN,
      args: [payload || {}],
    });
    const value = results && results[0] ? results[0].result : null;
    return { success: true, result: value };
  } catch (err) {
    return { success: false, error: err && err.message ? err.message : String(err) };
  }
}

/**
 * Fonction sérialisée puis exécutée DANS le MAIN world de la page (donc avec
 * accès à juic, jQuery, etc.). Doit être autonome (aucune référence externe).
 */
function SF_MAIN_FN(payload) {
  try {
    function byId(id) { return id ? document.getElementById(id) : null; }
    function byToken(t) { return t ? document.querySelector('[data-cvgen-mw="' + t + '"]') : null; }
    function getEl(p) { return byId(p.id) || byToken(p.token); }
    function nativeSet(el, val) {
      var proto = el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      var d = Object.getOwnPropertyDescriptor(proto, "value");
      if (d && d.set) { d.set.call(el, val); } else { el.value = val; }
    }
    function callHandler(el, name, ev) {
      try {
        if (typeof el[name] === "function") { el[name](ev); return true; }
      } catch (_) {}
      return false;
    }

    var a = payload.action;

    if (a === "click") {
      var el = getEl(payload);
      if (!el) return { ok: false, error: "introuvable" };
      try { el.focus(); } catch (_) {}
      callHandler(el, "onclick", new MouseEvent("click", { bubbles: true, cancelable: true }));
      try { el.click(); } catch (_) {}
      return { ok: true };
    }

    if (a === "setValueBlur") {
      var el2 = getEl(payload);
      if (!el2) return { ok: false, error: "introuvable" };
      try { el2.focus(); } catch (_) {}
      nativeSet(el2, payload.value);
      try { el2.setAttribute("title", payload.value); } catch (_) {}
      el2.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      el2.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      callHandler(el2, "onblur", new FocusEvent("blur", { bubbles: true, relatedTarget: document.body }));
      el2.dispatchEvent(new FocusEvent("blur", { bubbles: true, cancelable: true, relatedTarget: document.body }));
      el2.dispatchEvent(new Event("focusout", { bubbles: true, cancelable: true }));
      try { if (document.activeElement === el2) el2.blur(); } catch (_) {}
      return { ok: true, value: el2.value, title: el2.getAttribute("title") || "" };
    }

    if (a === "typeFilter") {
      var el3 = getEl(payload);
      if (!el3) return { ok: false, error: "introuvable" };
      try { el3.focus(); } catch (_) {}
      nativeSet(el3, payload.value);
      el3.dispatchEvent(new Event("input", { bubbles: true }));
      el3.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a", keyCode: 65 }));
      return { ok: true };
    }

    if (a === "openCombobox") {
      var input = byId(payload.id);
      if (!input) return { ok: false, error: "introuvable" };
      try { input.focus(); } catch (_) {}
      var btn = payload.btnId ? document.getElementById(payload.btnId) : null;
      if (btn) {
        callHandler(btn, "onclick", new MouseEvent("click", { bubbles: true }));
        try { btn.click(); } catch (_) {}
      }
      try {
        var kd = new KeyboardEvent("keydown", {
          bubbles: true, cancelable: true, key: "ArrowDown", code: "ArrowDown", keyCode: 40, which: 40,
        });
        Object.defineProperty(kd, "keyCode", { get: function () { return 40; } });
        Object.defineProperty(kd, "which", { get: function () { return 40; } });
        input.dispatchEvent(kd);
      } catch (_) {}
      callHandler(input, "onkeydown", new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown", keyCode: 40 }));
      callHandler(input, "onclick", new MouseEvent("click", { bubbles: true }));
      try { input.click(); } catch (_) {}
      return { ok: true };
    }

    return { ok: false, error: "action inconnue : " + a };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e) };
  }
}

/**
 * POST /api/auth/login → stocke le token et récupère le profil utilisateur.
 */
async function handleLogin(payload) {
  if (!payload || !payload.email || !payload.password) {
    return { success: false, error: "Email et mot de passe requis." };
  }

  try {
    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
      }),
    });

    // L'API retourne { success, message, data: { accessToken, ... } }
    const authData = response.data || response;

    await Storage.setToken(authData.accessToken);

    if (authData.expiresIn) {
      await Storage.set("tokenExpiry", Date.now() + authData.expiresIn * 1000);
    }

    // Les infos utilisateur sont directement dans la réponse login
    const user = {
      id: authData.userId,
      email: authData.email,
      prenom: authData.firstName,
      nom: authData.lastName,
    };
    await Storage.setUser(user);

    Logger.log("Connexion réussie pour " + user.email);
    return { success: true, user };
  } catch (err) {
    Logger.error("Échec de connexion", err);
    return { success: false, error: err.message };
  }
}

/**
 * Efface toutes les données locales (token, profil, user).
 */
async function handleLogout() {
  await Storage.clear();
  Logger.log("Déconnexion effectuée");
  return { success: true };
}

/**
 * GET /api/profile/complet → met en cache et retourne le profil.
 */
async function handleGetProfile() {
  try {
    const profil = await apiFetch("/api/profile/complet");
    await Storage.setProfile(profil);
    await Storage.setProfileSyncDate(new Date().toISOString());

    Logger.log("Profil synchronisé");
    return { success: true, profil };
  } catch (err) {
    Logger.error("Échec récupération profil", err);
    return { success: false, error: err.message };
  }
}

/**
 * Force le rechargement du profil depuis l'API (ignore le cache).
 */
async function handleSyncProfile() {
  return handleGetProfile();
}

/**
 * Retourne le profil depuis le cache.
 * Si absent, déclenche automatiquement un rechargement API.
 */
async function handleGetCachedProfile() {
  let profil = await Storage.getProfile();

  if (!profil) {
    Logger.log("Profil absent du cache — rechargement depuis l'API");
    const result = await handleGetProfile();
    profil = result.success ? result.profil : null;
  }

  return {
    success: !!profil,
    profil: profil || null,
    error: profil
      ? undefined
      : "Profil indisponible. Vérifiez votre connexion.",
  };
}

/**
 * Retourne les infos utilisateur stockées localement.
 */
async function handleGetUser() {
  const user = await Storage.getUser();
  const token = await Storage.getToken();

  return {
    success: !!(user && token),
    user: user || null,
    isAuthenticated: !!(user && token),
  };
}

/**
 * Agent IA — prépare les documents pour une candidature :
 *  1. génère un CV optimisé pour l'offre (Gemini)
 *  2. exporte ce CV en PDF
 *  3. génère une lettre de motivation (Gemini)
 *  4. convertit la lettre en PDF
 *
 * Stocke le tout dans chrome.storage.local (cvBase64, lmBase64,
 * lettreMotivation…) afin que le flux FILL_FORM existant l'utilise.
 *
 * @param {{ offer: { title?: string, company?: string, offerText?: string }, tone?: string }} payload
 */
function slugify(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function docTimestamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    p(d.getMonth() + 1) +
    p(d.getDate()) +
    "_" +
    p(d.getHours()) +
    p(d.getMinutes())
  );
}

async function handleAiPrepare(payload) {
  const offer = (payload && payload.offer) || {};
  const offerText = (offer.offerText || "").trim();
  const company = offer.company || "";
  const jobTitle = offer.title || "";
  const tone = (payload && payload.tone) || "formel";
  // Suffixe descriptif (titre/société + horodatage) pour distinguer visuellement
  // les documents d'une offre à l'autre.
  const docSlug = slugify(jobTitle || company) || "offre";
  const docTs = docTimestamp();

  if (!offerText || offerText.length < 30) {
    return {
      success: false,
      error:
        "Offre introuvable ou trop courte sur cette page. Ouvrez la page de l'offre puis réessayez.",
    };
  }

  const result = { steps: {} };

  try {
    // 1. CV optimisé
    Logger.log("Agent IA — génération du CV optimisé…");
    const cvResp = await apiFetch("/api/generation/generate", {
      method: "POST",
      body: JSON.stringify({ jobOfferText: offerText }),
    });
    const cvData = cvResp.data || cvResp;
    const generatedCvId = cvData.generatedCvId;
    result.steps.cv = true;
    result.cvTitle = cvData.title || "";

    // 2. Export CV → PDF
    if (generatedCvId) {
      Logger.log("Agent IA — export PDF du CV…");
      const cvPdf = await apiFetchBinary(
        "/api/generation/" + generatedCvId + "/export-pdf",
        { method: "POST", body: JSON.stringify({ templateId: "template1" }) },
      );
      const cvName = "CV_" + docSlug + "_" + docTs + ".pdf";
      await Storage.set("cvBase64", cvPdf.base64);
      await Storage.set("cvFileName", cvName);
      result.cvName = cvName;
      result.steps.cvPdf = true;
    }

    // 3. Lettre de motivation
    Logger.log("Agent IA — génération de la lettre de motivation…");
    const clResp = await apiFetch("/api/generation/cover-letter", {
      method: "POST",
      body: JSON.stringify({
        jobOfferText: offerText,
        company: company,
        jobTitle: jobTitle,
        tone: tone,
      }),
    });
    const clData = clResp.data || clResp;
    const coverLetterText = clData.content || "";
    if (coverLetterText) {
      await Storage.setCoverLetter(coverLetterText);
      result.coverLetterText = coverLetterText;
      result.steps.coverLetter = true;
    }

    // 4. Lettre → PDF
    if (coverLetterText) {
      Logger.log("Agent IA — export PDF de la lettre…");
      const clPdf = await apiFetchBinary("/api/generation/cover-letter/pdf", {
        method: "POST",
        body: JSON.stringify({ content: coverLetterText }),
      });
      const lmName = "Lettre_" + docSlug + "_" + docTs + ".pdf";
      await Storage.set("lmBase64", clPdf.base64);
      await Storage.set("lmFileName", lmName);
      result.lmName = lmName;
      result.steps.coverLetterPdf = true;
    }

    result.success = true;
    Logger.log("Agent IA — documents prêts.");
    return result;
  } catch (err) {
    Logger.error("Agent IA — échec de préparation", err);
    return {
      success: false,
      error: err.message || "Erreur lors de la préparation des documents IA.",
      steps: result.steps,
    };
  }
}
