/**
 * CVGen Popup — Logique principale
 * Orchestre l'UI du popup : login, profil, détection de champs, remplissage.
 */

"use strict";

const CVGEN_APP_URL = "https://cvgen.fr";

// ─── Init ─────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  init().catch(function (err) {
    Logger.error("Erreur init popup", err);
    showScreen("login");
  });
});

async function init() {
  showScreen("loading");

  try {
    const response = await sendToServiceWorker({ type: "GET_USER" });

    if (response && response.isAuthenticated && response.user) {
      await showConnectedScreen(response.user);
    } else {
      showScreen("login");
    }
  } catch (_) {
    showScreen("login");
  }
}

// ─── Navigation entre écrans ──────────────────────────────────────────────────

function showScreen(name) {
  document.getElementById("screen-loading").style.display =
    name === "loading" ? "flex" : "none";
  document.getElementById("screen-login").style.display =
    name === "login" ? "flex" : "none";
  document.getElementById("screen-connected").style.display =
    name === "connected" ? "flex" : "none";
}

// ─── Écran connecté ───────────────────────────────────────────────────────────

async function showConnectedScreen(user) {
  // Avatar
  const initial = (user.prenom || user.email || "?").charAt(0).toUpperCase();
  document.getElementById("user-avatar").textContent = initial;
  document.getElementById("user-name").textContent = user.prenom
    ? user.prenom + (user.nom ? " " + user.nom : "")
    : user.email;
  document.getElementById("user-email").textContent = user.email || "";

  // Date de sync
  const syncDate = await Storage.getProfileSyncDate();
  updateSyncBadge(syncDate);

  // Indicateur site courant
  await updateSiteIndicator();

  // Lettre de motivation
  const coverLetter = await Storage.getCoverLetter();
  const hint = document.getElementById("cover-letter-hint");
  hint.style.display = coverLetter ? "none" : "flex";

  // Statut des fichiers PDF déjà stockés
  await refreshDocStatus();

  showScreen("connected");

  // Détecter les champs sur la page active
  await refreshDetectedFields();
}

// ─── Sync badge ────────────────────────────────────────────────────────────────

function updateSyncBadge(isoDate) {
  const label = document.getElementById("sync-label");
  const dot = document.querySelector(".sync-dot");

  if (!isoDate) {
    label.textContent = "Profil non synchronisé";
    dot.className = "sync-dot sync-dot--warning";
    return;
  }

  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now - d;
  const diffH = diffMs / 3600000;

  let relativeLabel;
  if (diffH < 1) {
    relativeLabel = "il y a moins d'une heure";
  } else if (diffH < 24) {
    relativeLabel = "il y a " + Math.floor(diffH) + " h";
  } else {
    relativeLabel = d.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  }

  label.textContent = "Profil synchronisé — " + relativeLabel;
  dot.className =
    diffH > 48 ? "sync-dot sync-dot--warning" : "sync-dot sync-dot--ok";
}

// ─── Indicateur site courant ──────────────────────────────────────────────────

const KNOWN_SITES = {
  "career5.successfactors.eu": { name: "SAP SuccessFactors", icon: "🏢" },
  "career4.successfactors.eu": { name: "SAP SuccessFactors", icon: "🏢" },
  "career5.successfactors.com": { name: "SAP SuccessFactors", icon: "🏢" },
  "jobs.smartrecruiters.com": { name: "SmartRecruiters", icon: "💼" },
  "capgemini.taleo.net": { name: "Taleo (Capgemini)", icon: "🏢" },
  // existing entries below
  "fr.indeed.com": { name: "Indeed FR", icon: "✓" },
  "www.indeed.com": { name: "Indeed", icon: "✓" },
  "www.linkedin.com": { name: "LinkedIn", icon: "✓" },
  "www.welcometothejungle.com": { name: "Welcome to the Jungle", icon: "✓" },
  "candidat.francetravail.fr": { name: "France Travail", icon: "✓" },
  "app.greenhouse.io": { name: "Greenhouse", icon: "✓" },
  "jobs.lever.co": { name: "Lever", icon: "✓" },
};

async function updateSiteIndicator() {
  const tab = await getActiveTab();
  const indicator = document.getElementById("site-indicator");
  const siteNameEl = document.getElementById("site-name");

  if (!tab || !tab.url) {
    siteNameEl.textContent = "Site inconnu";
    return;
  }

  let hostname = "";
  try {
    hostname = new URL(tab.url).hostname;
  } catch (_) {
    siteNameEl.textContent = "Page non accessible";
    return;
  }

  const config = KNOWN_SITES[hostname];
  if (config) {
    indicator.style.borderColor = "rgba(34,197,94,0.4)";
    siteNameEl.innerHTML =
      config.name +
      ' <span style="color:#22c55e">' +
      config.icon +
      " détecté</span>";
  } else {
    siteNameEl.textContent = "Site non reconnu — détection automatique";
  }
}

// ─── Détection des champs ─────────────────────────────────────────────────────

async function refreshDetectedFields() {
  const fillBtn = document.getElementById("btn-fill");
  const countEl = document.getElementById("fields-count");
  const listEl = document.getElementById("fields-list");

  try {
    const response = await sendToContentScript({ type: "DETECT_FIELDS" });

    if (!response || !response.success || !response.fields) {
      setFieldsList([], countEl, listEl);
      fillBtn.disabled = true;
      return;
    }

    setFieldsList(response.fields, countEl, listEl);
    fillBtn.disabled = response.fields.length === 0;
  } catch (_) {
    // Content script non injecté sur cette page (chrome://, about:…, ou iframe bloqué)
    setFieldsList([], countEl, listEl);
    fillBtn.disabled = false; // Laisser l'utilisateur essayer quand même
    document
      .getElementById("site-indicator")
      .querySelector("#site-name").textContent =
      "Naviguez sur un formulaire de candidature";
  }
}

const FIELD_TYPE_LABELS = {
  prenom: "Prénom",
  nom: "Nom",
  nom_complet: "Nom complet",
  email: "Email",
  telephone: "Téléphone",
  adresse: "Adresse",
  ville: "Ville",
  code_postal: "Code postal",
  pays: "Pays",
  region: "Région",
  titre_poste: "Titre du poste",
  resume_professionnel: "Résumé",
  annees_experience: "Années d'expérience",
  niveau_etudes: "Niveau d'études",
  lettre_motivation: "Lettre de motivation",
  disponibilite: "Disponibilité",
  salaire: "Prétention salariale",
  type_contrat: "Type de contrat",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  github: "GitHub",
  genre: "Civilité",
  handicap: "RQTH",
  date_naissance: "Date de naissance",
  nationalite: "Nationalité",
  competences: "Compétences",
  langues: "Langues",
  permis: "Permis",
  autorisation_travail: "Autorisation de travail",
  source_candidature: "Source candidature",
  date_debut: "Date de début",
  date_fin: "Date de fin",
  date_diplome: "Date diplôme",
  domaine_etude: "Domaine d'étude",
  ecole: "École/Université",
  employeur_actuel: "Employeur actuel",
  indicatif_telephone: "Code pays téléphone",
  nom_formation: "Nom de la formation",
  diplome_plus_eleve: "Diplôme le plus élevé",
};

function setFieldsList(fields, countEl, listEl) {
  countEl.textContent = fields.length;
  listEl.innerHTML = "";

  if (fields.length === 0) {
    const li = document.createElement("li");
    li.className = "fields-empty";
    li.textContent = "Aucun champ CVGen détecté sur cette page.";
    listEl.appendChild(li);
    return;
  }

  fields.forEach(function (f) {
    const li = document.createElement("li");
    const typeSpan = document.createElement("span");
    typeSpan.className = "field-type";
    typeSpan.textContent = FIELD_TYPE_LABELS[f.type] || f.type;
    const tagSpan = document.createElement("span");
    tagSpan.textContent = f.tag;
    li.appendChild(typeSpan);
    li.appendChild(tagSpan);
    listEl.appendChild(li);
  });
}

// ─── Événements ───────────────────────────────────────────────────────────────

// --- Login ---
document
  .getElementById("login-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("input-email").value.trim();
    const password = document.getElementById("input-password").value;
    const errorEl = document.getElementById("login-error");
    const btnText = document.getElementById("btn-login-text");
    const spinner = document.getElementById("btn-login-spinner");
    const btn = document.getElementById("btn-login");

    errorEl.style.display = "none";
    errorEl.textContent = "";

    if (!email || !password) {
      errorEl.textContent = "Veuillez renseigner votre email et mot de passe.";
      errorEl.style.display = "block";
      return;
    }

    btn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "inline-block";

    try {
      const response = await sendToServiceWorker({
        type: "LOGIN",
        payload: { email, password },
      });

      if (response && response.success) {
        await showConnectedScreen(response.user);
      } else {
        errorEl.textContent =
          response && response.error
            ? response.error
            : "Identifiants incorrects.";
        errorEl.style.display = "block";
      }
    } catch (err) {
      errorEl.textContent = "Impossible de contacter le serveur.";
      errorEl.style.display = "block";
    } finally {
      btn.disabled = false;
      btnText.style.display = "inline";
      spinner.style.display = "none";
    }
  });

// --- Afficher/masquer mot de passe ---
document
  .getElementById("toggle-password")
  .addEventListener("click", function () {
    const input = document.getElementById("input-password");
    input.type = input.type === "password" ? "text" : "password";
  });

// --- Créer un compte ---
document
  .getElementById("link-register")
  .addEventListener("click", function (e) {
    e.preventDefault();
    chrome.tabs.create({ url: CVGEN_APP_URL + "/register" });
  });

// --- Générer lettre de motivation ---
document
  .getElementById("link-generate-cover")
  .addEventListener("click", function (e) {
    e.preventDefault();
    chrome.tabs.create({ url: CVGEN_APP_URL + "/dashboard/cover-letter" });
  });

// --- Remplir le formulaire ---
document
  .getElementById("btn-fill")
  .addEventListener("click", async function () {
    const btn = document.getElementById("btn-fill");
    const btnText = document.getElementById("btn-fill-text");
    const spinner = document.getElementById("btn-fill-spinner");
    const resultEl = document.getElementById("fill-result");

    btn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "inline-block";
    resultEl.style.display = "none";

    try {
      const response = await sendToContentScript({
        type: "FILL_FORM",
        options: { overwrite: false },
      });

      if (response && response.success) {
        const n = response.filled;
        const t = response.total;
        resultEl.textContent =
          n +
          " champ" +
          (n > 1 ? "s" : "") +
          " rempli" +
          (n > 1 ? "s" : "") +
          " sur " +
          t +
          " détecté" +
          (t > 1 ? "s" : "");
        resultEl.className = "fill-result success";
      } else {
        resultEl.textContent =
          response && response.error
            ? response.error
            : "Erreur lors du remplissage.";
        resultEl.className = "fill-result error";
      }

      resultEl.style.display = "block";
    } catch (err) {
      resultEl.textContent = "Impossible de communiquer avec la page.";
      resultEl.className = "fill-result error";
      resultEl.style.display = "block";
      Logger.error("FILL_FORM error", err);
    } finally {
      btn.disabled = false;
      btnText.style.display = "inline";
      spinner.style.display = "none";
    }
  });

// --- Actualiser le profil ---
document
  .getElementById("btn-sync")
  .addEventListener("click", async function () {
    const btn = document.getElementById("btn-sync");
    btn.disabled = true;

    try {
      const response = await sendToServiceWorker({ type: "SYNC_PROFILE" });
      if (response && response.success) {
        const syncDate = await Storage.getProfileSyncDate();
        updateSyncBadge(syncDate);
        await refreshDetectedFields();
      }
    } finally {
      btn.disabled = false;
    }
  });

// --- Options ---
document.getElementById("btn-options").addEventListener("click", function () {
  chrome.runtime.openOptionsPage();
});

// --- Déconnexion ---
document
  .getElementById("btn-logout")
  .addEventListener("click", async function () {
    await sendToServiceWorker({ type: "LOGOUT" });
    showScreen("login");
    document.getElementById("input-email").value = "";
    document.getElementById("input-password").value = "";
  });

// --- Upload CV PDF ---
document.getElementById("btn-upload-cv").addEventListener("click", function () {
  document.getElementById("input-cv").click();
});

document.getElementById("input-cv").addEventListener("change", async function () {
  const file = this.files && this.files[0];
  if (!file) return;
  try {
    const b64 = await fileToBase64(file);
    await Storage.set("cvBase64", b64);
    await Storage.set("cvFileName", file.name);
    updateDocStatus("doc-cv-status", file.name, file.size);
  } catch (err) {
    Logger.error("Upload CV", err);
  }
  this.value = "";
});

// --- Upload Lettre de motivation PDF ---
document.getElementById("btn-upload-lm").addEventListener("click", function () {
  document.getElementById("input-lm").click();
});

document.getElementById("input-lm").addEventListener("change", async function () {
  const file = this.files && this.files[0];
  if (!file) return;
  try {
    const b64 = await fileToBase64(file);
    await Storage.set("lmBase64", b64);
    await Storage.set("lmFileName", file.name);
    updateDocStatus("doc-lm-status", file.name, file.size);
  } catch (err) {
    Logger.error("Upload LM", err);
  }
  this.value = "";
});

// ─── Helpers documents ───────────────────────────────────────────────────────

async function refreshDocStatus() {
  const cvName = await Storage.get("cvFileName");
  const lmName = await Storage.get("lmFileName");
  if (cvName) updateDocStatus("doc-cv-status", cvName, null);
  if (lmName) updateDocStatus("doc-lm-status", lmName, null);
}

function updateDocStatus(elId, filename, size) {
  const el = document.getElementById(elId);
  if (!el) return;
  // Tronquer le nom de fichier si trop long
  const shortName = filename.length > 20 ? filename.substring(0, 18) + "…" : filename;
  const sizeStr = size ? " (" + Math.round(size / 1024) + " Ko)" : "";
  el.textContent = shortName + sizeStr;
  el.style.color = "var(--color-success)";
}

function fileToBase64(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () {
      // result = "data:application/pdf;base64,AAAA..." → on garde juste la partie base64
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- TOKEN_EXPIRED depuis le service worker ---
chrome.runtime.onMessage.addListener(function (message) {
  if (message.type === "TOKEN_EXPIRED") {
    showScreen("login");
    const errorEl = document.getElementById("login-error");
    errorEl.textContent = "Session expirée. Veuillez vous reconnecter.";
    errorEl.style.display = "block";
  }
});

// ─── Helpers communication ────────────────────────────────────────────────────

function sendToServiceWorker(message) {
  return new Promise(function (resolve, reject) {
    chrome.runtime.sendMessage(message, function (response) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function sendToContentScript(message) {
  const tab = await getActiveTab();
  if (!tab) throw new Error("Pas d'onglet actif");

  // 1er essai : envoyer directement
  try {
    return await sendMessageToTab(tab.id, message);
  } catch (firstErr) {
    // "Receiving end does not exist" → content script absent, on l'injecte
    if (
      !firstErr.message.includes("Receiving end") &&
      !firstErr.message.includes("Could not establish")
    ) {
      throw firstErr;
    }
  }

  // Injection manuelle du content script
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [
        "utils/logger.js",
        "utils/storage.js",
        "content/field-detector.js",
        "content/field-mapper.js",
        "content/field-filler.js",
        "content/dynamic-sections.js",
        "content/date-handler.js",
        "content/offer-extractor.js",
        "content/file-uploader.js",
        "content/content-script.js",
      ],
    });
    // Attendre que le script s'initialise
    await new Promise(function (r) {
      setTimeout(r, 400);
    });
  } catch (injectErr) {
    throw new Error(
      "Impossible d'injecter le script sur cette page. Rechargez la page (F5) puis réessayez.",
    );
  }

  // 2ème essai après injection
  return await sendMessageToTab(tab.id, message);
}

function sendMessageToTab(tabId, message) {
  return new Promise(function (resolve, reject) {
    chrome.tabs.sendMessage(tabId, message, function (response) {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function getActiveTab() {
  return new Promise(function (resolve) {
    // lastFocusedWindow:true pour récupérer l'onglet du navigateur (pas la popup)
    chrome.tabs.query(
      { active: true, lastFocusedWindow: true },
      function (tabs) {
        if (tabs && tabs[0]) {
          resolve(tabs[0]);
          return;
        }
        // Fallback : currentWindow
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs2) {
            resolve(tabs2 && tabs2[0] ? tabs2[0] : null);
          },
        );
      },
    );
  });
}
