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
      // Le content script a répondu mais sans champs visibles : certains sites
      // verrouillent leurs champs (Shadow DOM fermé) et restent remplissables
      // via CDP. On laisse donc l'utilisateur tenter le remplissage.
      fillBtn.disabled = false;
      return;
    }

    setFieldsList(response.fields, countEl, listEl);
    // On n'empêche jamais le clic : même avec 0 champ "visible", il peut y avoir
    // des champs scellés (oc-input) que seul le CDP sait remplir.
    fillBtn.disabled = false;
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
      const prefs = (await Storage.get("preferences")) || {};
      const response = await sendToContentScript({
        type: "FILL_FORM",
        options: {
          overwrite: prefs.overwrite === true,
          showToast: prefs.showToast !== false,
        },
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

// ═══════════════════ AGENT IA — Auto-postulation ═══════════════════

function aiSetStep(step, state) {
  const li = document.querySelector('#ai-steps li[data-step="' + step + '"]');
  if (!li) return;
  li.classList.remove("active", "done");
  const icon = li.querySelector(".ai-step-icon");
  if (state === "active") {
    li.classList.add("active");
    if (icon) icon.textContent = "◐";
  } else if (state === "done") {
    li.classList.add("done");
    if (icon) icon.textContent = "✓";
  } else {
    if (icon) icon.textContent = "○";
  }
}

function aiResetSteps() {
  ["offer", "cv", "cover", "fill"].forEach(function (s) { aiSetStep(s, "pending"); });
}

function aiShowResult(message, kind) {
  const el = document.getElementById("ai-result");
  el.textContent = message;
  el.className = "fill-result " + (kind || "success");
  el.style.display = "block";
}

document
  .getElementById("btn-ai-apply")
  .addEventListener("click", async function () {
    const btn = document.getElementById("btn-ai-apply");
    const btnText = document.getElementById("btn-ai-text");
    const spinner = document.getElementById("btn-ai-spinner");
    const steps = document.getElementById("ai-steps");
    const preview = document.getElementById("ai-preview");
    const submitZone = document.getElementById("ai-submit-zone");
    const resultEl = document.getElementById("ai-result");

    btn.disabled = true;
    btnText.style.display = "none";
    spinner.style.display = "inline-block";
    steps.style.display = "flex";
    preview.style.display = "none";
    submitZone.style.display = "none";
    resultEl.style.display = "none";
    aiResetSteps();

    try {
      // 1. Lecture de l'offre depuis la page
      aiSetStep("offer", "active");
      const offerResp = await sendToContentScript({ type: "EXTRACT_OFFER" });
      if (!offerResp || !offerResp.success || !offerResp.offer) {
        throw new Error("Impossible de lire l'offre sur cette page.");
      }
      const offer = offerResp.offer || {};

      // Enrichissement : sur SmartRecruiters, la page de candidature ne contient
      // que le titre. On va chercher la description COMPLÈTE via l'API publique
      // (sinon le CV/lettre seraient génériques et identiques d'une offre à l'autre).
      try {
        const tabForUrl = await getActiveTab();
        const sr = parseSmartRecruiters(tabForUrl && tabForUrl.url);
        if (sr) {
          const posting = await sendToServiceWorker({
            type: "FETCH_SR_POSTING",
            payload: sr,
          });
          if (posting && posting.success && (posting.offerText || "").length > 50) {
            offer.title = posting.title || offer.title;
            offer.company = posting.company || offer.company;
            offer.offerText = posting.offerText;
            Logger.log("Offre enrichie via API SmartRecruiters (" + posting.offerText.length + " car.)");
          }
        }
      } catch (e) {
        Logger.warn("Enrichissement offre SR échoué: " + (e && e.message));
      }

      // Texte d'offre effectif = titre + entreprise + description trouvée.
      const effectiveText = [offer.title, offer.company, offer.offerText]
        .filter(Boolean)
        .join("\n")
        .trim();
      if (effectiveText.length < 15) {
        throw new Error(
          "Aucune offre détectée sur cette page. Ouvrez la page de l'offre (sa description) puis réessayez.",
        );
      }
      offer.offerText = effectiveText;
      aiSetStep("offer", "done");

      // 2+3. Génération CV + lettre (backend Gemini). Si ça échoue (quota, etc.),
      // on continue quand même jusqu'au remplissage du formulaire.
      aiSetStep("cv", "active");
      let genOk = false;
      let genError = "";
      try {
        const prep = await sendToServiceWorker({
          type: "AI_PREPARE",
          payload: { offer: offer, tone: "formel" },
        });
        if (prep && prep.success) {
          genOk = true;
          aiSetStep("cv", "done");
          aiSetStep("cover", "done");

          preview.style.display = "block";
          await refreshDocStatus();
          if (prep.cvName) {
            document.getElementById("ai-cv-line").style.display = "block";
            document.getElementById("ai-cv-name").textContent = prep.cvName;
          }
          if (prep.lmName) {
            document.getElementById("ai-lm-line").style.display = "block";
            document.getElementById("ai-lm-name").textContent = prep.lmName;
          }
          if (prep.coverLetterText) {
            document.getElementById("ai-letter-details").style.display = "block";
            document.getElementById("ai-letter-text").value = prep.coverLetterText;
          }
        } else {
          genError = (prep && prep.error) || "Échec de génération IA.";
        }
      } catch (e) {
        genError = e.message || "Échec de génération IA.";
      }
      if (!genOk) {
        aiSetStep("cv", "pending");
        aiSetStep("cover", "pending");
        Logger.warn("Génération IA échouée, on remplit quand même : " + genError);
      }

      // 4. Remplissage du formulaire (réutilise FILL_FORM, overwrite activé).
      // Effectué MÊME si la génération a échoué (les champs ne dépendent pas du CV).
      aiSetStep("fill", "active");
      const fillResp = await sendToContentScript({
        type: "FILL_FORM",
        options: { overwrite: true, showToast: true },
      });
      aiSetStep("fill", "done");

      const filledN = fillResp && fillResp.success ? fillResp.filled : 0;
      if (genOk) {
        aiShowResult(
          "Documents générés et " + filledN + " champ(s) rempli(s). Vérifiez puis envoyez.",
          "success",
        );
      } else {
        aiShowResult(
          filledN + " champ(s) rempli(s). ⚠ Génération du CV/lettre indisponible (" +
            genError + ") — formulaire rempli avec vos infos.",
          "error",
        );
      }

      // 5. Détecter le bouton d'envoi et proposer la confirmation
      try {
        const sub = await sendToContentScript({ type: "AI_DESCRIBE_SUBMIT" });
        const info = document.getElementById("ai-submit-info");
        if (sub && sub.success && sub.submit && sub.submit.found) {
          info.textContent = 'Bouton détecté : "' + (sub.submit.label || "Envoyer") + '"';
        } else {
          info.textContent =
            "Bouton d'envoi non détecté automatiquement — cliquez-le vous-même sur la page.";
        }
      } catch (_) {
        document.getElementById("ai-submit-info").textContent =
          "Vérifiez le formulaire avant d'envoyer.";
      }
      submitZone.style.display = "flex";
    } catch (err) {
      aiShowResult(err.message || "Erreur de l'agent IA.", "error");
      Logger.error("AI_APPLY error", err);
    } finally {
      btn.disabled = false;
      btnText.style.display = "inline";
      spinner.style.display = "none";
    }
  });

// --- Enregistrer les modifications de la lettre ---
document
  .getElementById("btn-ai-letter-save")
  .addEventListener("click", async function () {
    const text = document.getElementById("ai-letter-text").value || "";
    await Storage.setCoverLetter(text);
    aiShowResult("Lettre mise à jour. Relancez le remplissage pour l'appliquer.", "success");
  });

// --- Confirmer l'envoi de la candidature ---
document
  .getElementById("btn-ai-submit")
  .addEventListener("click", async function () {
    const btn = document.getElementById("btn-ai-submit");
    btn.disabled = true;
    try {
      const res = await sendToContentScript({
        type: "AI_SUBMIT",
        options: { confirm: true },
      });
      if (res && res.success) {
        aiShowResult("✓ Candidature envoyée (" + (res.label || "bouton cliqué") + ").", "success");
        document.getElementById("ai-submit-zone").style.display = "none";
      } else {
        aiShowResult(res && res.error ? res.error : "Échec de l'envoi.", "error");
      }
    } catch (err) {
      aiShowResult("Impossible d'envoyer : " + err.message, "error");
    } finally {
      btn.disabled = false;
    }
  });

// --- Ne pas envoyer (vérification manuelle) ---
document
  .getElementById("btn-ai-skip")
  .addEventListener("click", function () {
    document.getElementById("ai-submit-zone").style.display = "none";
    aiShowResult("Envoi annulé. Vérifiez puis cliquez le bouton d'envoi vous-même.", "success");
  });

// --- Téléchargement des documents générés (pour vérifier le contenu) ---
function base64ToBlob(base64, mime) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime || "application/pdf" });
}

async function downloadStoredPdf(base64Key, nameKey, fallbackName) {
  const base64 = await Storage.get(base64Key);
  if (!base64) {
    aiShowResult("Aucun document à télécharger. Lancez d'abord l'agent IA.", "error");
    return;
  }
  const name = (await Storage.get(nameKey)) || fallbackName;
  const blob = base64ToBlob(base64, "application/pdf");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}

document
  .getElementById("btn-ai-cv-download")
  .addEventListener("click", function () {
    downloadStoredPdf("cvBase64", "cvFileName", "CV.pdf");
  });

document
  .getElementById("btn-ai-lm-download")
  .addEventListener("click", function () {
    downloadStoredPdf("lmBase64", "lmFileName", "Lettre_motivation.pdf");
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
    updateDocStatus("doc-cv-status", file.name, file.size, "cv");
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
    updateDocStatus("doc-lm-status", file.name, file.size, "lm");
  } catch (err) {
    Logger.error("Upload LM", err);
  }
  this.value = "";
});

// ─── Helpers documents ───────────────────────────────────────────────────────

async function refreshDocStatus() {
  const cvName = await Storage.get("cvFileName");
  const lmName = await Storage.get("lmFileName");
  if (cvName) updateDocStatus("doc-cv-status", cvName, null, "cv");
  else        resetDocStatus("doc-cv-status");
  if (lmName) updateDocStatus("doc-lm-status", lmName, null, "lm");
  else        resetDocStatus("doc-lm-status");
}

function updateDocStatus(elId, filename, size, kind) {
  const el = document.getElementById(elId);
  if (!el) return;
  const shortName = filename.length > 20 ? filename.substring(0, 18) + "…" : filename;
  const sizeStr = size ? " (" + Math.round(size / 1024) + " Ko)" : "";

  el.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = "✓ " + shortName + sizeStr;
  text.style.color = "var(--color-success)";
  el.appendChild(text);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.textContent = "×";
  removeBtn.title = "Supprimer";
  removeBtn.style.cssText =
    "margin-left:6px;border:none;background:transparent;color:#dc3545;" +
    "cursor:pointer;font-size:16px;line-height:1;padding:0 4px;";
  removeBtn.addEventListener("click", async function () {
    await removeDocument(kind);
  });
  el.appendChild(removeBtn);
}

function resetDocStatus(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = "";
  el.textContent = "Aucun fichier";
  el.style.color = "";
}

async function removeDocument(kind) {
  if (kind === "cv") {
    await Storage.set("cvBase64", null);
    await Storage.set("cvFileName", null);
    resetDocStatus("doc-cv-status");
    Logger.log("CV supprimé du stockage local");
  } else if (kind === "lm") {
    await Storage.set("lmBase64", null);
    await Storage.set("lmFileName", null);
    resetDocStatus("doc-lm-status");
    Logger.log("Lettre supprimée du stockage local");
  }
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

/**
 * Extrait companyId + postingId d'une URL SmartRecruiters pour interroger
 * l'API publique. Gère les formats oneclick-ui et jobs classiques.
 * Ex: .../company/SopraSteria1/publication/a6c5af4e-... → { companyId, postingId }
 */
function parseSmartRecruiters(url) {
  if (!url || url.indexOf("smartrecruiters.com") === -1) return null;
  // .../company/<companyId>/publication/<postingId>
  let m = url.match(/company\/([^/]+)\/(?:publication|jobs)\/([0-9a-fA-F-]{16,})/);
  if (m) return { companyId: m[1], postingId: m[2] };
  // jobs.smartrecruiters.com/<companyId>/<postingId-slug>
  m = url.match(/smartrecruiters\.com\/([^/?#]+)\/(\d{6,})/);
  if (m) return { companyId: m[1], postingId: m[2] };
  return null;
}

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
        "content/submit-handler.js",
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
