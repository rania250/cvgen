/**
 * CVGen Options — Logique
 */

"use strict";

const DEFAULT_API_URL = "http://localhost:8080";

document.addEventListener("DOMContentLoaded", async function () {
  await loadSettings();
  bindEvents();
});

async function loadSettings() {
  // URL API
  const apiUrl = await Storage.getApiBaseUrl();
  document.getElementById("api-url").value = apiUrl || DEFAULT_API_URL;

  // Préférences
  const prefs = (await Storage.get("preferences")) || {};
  document.getElementById("pref-auto-fill").checked = prefs.autoFill === true;
  document.getElementById("pref-overwrite").checked = prefs.overwrite === true;
  document.getElementById("pref-toast").checked = prefs.showToast !== false; // activé par défaut
}

function bindEvents() {
  // ── Enregistrer URL API ─────────────────────────────────
  document
    .getElementById("btn-save-api")
    .addEventListener("click", async function () {
      const raw = document.getElementById("api-url").value.trim();
      const successEl = document.getElementById("api-success");
      const errorEl = document.getElementById("api-error");

      successEl.style.display = "none";
      errorEl.style.display = "none";

      if (!raw) {
        errorEl.textContent = "L'URL ne peut pas être vide.";
        errorEl.style.display = "block";
        return;
      }

      try {
        const url = new URL(raw);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
          throw new Error("Protocole non supporté");
        }
        await Storage.setApiBaseUrl(raw.replace(/\/$/, ""));
        successEl.style.display = "block";
        setTimeout(function () {
          successEl.style.display = "none";
        }, 3000);
        Logger.log("URL API mise à jour: " + raw);
      } catch (_) {
        errorEl.textContent = "URL invalide. Exemple: https://api.cvgen.fr";
        errorEl.style.display = "block";
      }
    });

  // ── Réinitialiser URL API ───────────────────────────────
  document
    .getElementById("btn-reset-api")
    .addEventListener("click", async function () {
      document.getElementById("api-url").value = DEFAULT_API_URL;
      await Storage.setApiBaseUrl(DEFAULT_API_URL);
      const successEl = document.getElementById("api-success");
      successEl.textContent = "URL réinitialisée à " + DEFAULT_API_URL;
      successEl.style.display = "block";
      setTimeout(function () {
        successEl.style.display = "none";
      }, 3000);
    });

  // ── Enregistrer les préférences ──────────────────────────
  document
    .getElementById("btn-save-prefs")
    .addEventListener("click", async function () {
      const prefs = {
        autoFill: document.getElementById("pref-auto-fill").checked,
        overwrite: document.getElementById("pref-overwrite").checked,
        showToast: document.getElementById("pref-toast").checked,
      };

      await Storage.set("preferences", prefs);

      const successEl = document.getElementById("prefs-success");
      successEl.style.display = "block";
      setTimeout(function () {
        successEl.style.display = "none";
      }, 3000);
      Logger.log("Préférences sauvegardées", prefs);
    });

  // ── Vider le cache ───────────────────────────────────────
  document
    .getElementById("btn-clear-cache")
    .addEventListener("click", async function () {
      if (
        !confirm(
          "Vider le cache supprimera votre token et votre profil local. Continuer ?",
        )
      )
        return;

      await Storage.clear();

      const successEl = document.getElementById("cache-success");
      successEl.style.display = "block";
      Logger.log("Cache vidé");
    });
}
