/**
 * CVGen API Client
 * Chargé via importScripts dans le service worker uniquement.
 * Les content scripts n'appellent jamais l'API directement.
 */

// Valeur par défaut utilisée si aucune URL n'est encore stockée.
// Pointée sur le backend de dev local (Docker / Spring Boot port 8080).
// Modifiable à tout moment via la page Options (chrome.storage.local → apiBaseUrl)
// pour pointer vers une URL prod ex: https://api.cvgen.fr
var API_BASE_URL = "http://localhost:8080";

/**
 * Effectue un appel à l'API CVGen avec le token JWT Bearer.
 * En cas de 401, notifie le popup via chrome.runtime.sendMessage.
 *
 * @param {string} endpoint   - Chemin relatif, ex: '/api/profil/complet'
 * @param {RequestInit} options - Options fetch (method, body, headers…)
 * @returns {Promise<any>}    - Corps JSON de la réponse
 * @throws {Error}            - En cas d'erreur réseau ou HTTP ≥ 400
 */
async function apiFetch(endpoint, options) {
  options = options || {};

  // Récupérer l'URL de base depuis le storage (peut avoir été changée dans les options)
  const baseUrl = (await Storage.getApiBaseUrl()) || API_BASE_URL;
  const token = await Storage.getToken();

  const headers = Object.assign(
    {
      "Content-Type": "application/json",
    },
    token ? { Authorization: "Bearer " + token } : {},
    options.headers || {},
  );

  const url = baseUrl + endpoint;

  let response;
  try {
    response = await fetch(url, Object.assign({}, options, { headers }));
  } catch (networkError) {
    Logger.error("Erreur réseau vers " + url, networkError);
    throw new Error(
      "Impossible de joindre l'API CVGen. Vérifiez votre connexion.",
    );
  }

  if (response.status === 401) {
    Logger.warn("Token expiré ou invalide — déconnexion requise");
    // Notifier le popup si ouvert
    try {
      chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" });
    } catch (_) {
      // Popup peut être fermé — pas d'erreur
    }
    throw new Error("Session expirée. Veuillez vous reconnecter.");
  }

  if (!response.ok) {
    let errorBody = "";
    try {
      const errJson = await response.json();
      errorBody = errJson.message || JSON.stringify(errJson);
    } catch (_) {
      errorBody = response.statusText;
    }
    throw new Error("Erreur API " + response.status + ": " + errorBody);
  }

  return response.json();
}
