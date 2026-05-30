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
  return result;
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
async function handleAiPrepare(payload) {
  const offer = (payload && payload.offer) || {};
  const offerText = (offer.offerText || "").trim();
  const company = offer.company || "";
  const jobTitle = offer.title || "";
  const tone = (payload && payload.tone) || "formel";

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
      const cvName = cvPdf.fileName || "CV_CVGen.pdf";
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
      const lmName = clPdf.fileName || "Lettre_Motivation.pdf";
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
