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

  // 401 = non authentifié ; 403 = token expiré/invalide (le filtre JWT laisse
  // passer en anonyme puis Spring renvoie 403). Dans les deux cas → reconnexion.
  if (response.status === 401 || response.status === 403) {
    Logger.warn("Token expiré ou invalide (" + response.status + ") — reconnexion requise");
    try {
      chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" });
    } catch (_) {
      // Popup peut être fermé — pas d'erreur
    }
    throw new Error("Session expirée. Reconnectez-vous dans l'extension puis réessayez.");
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

/**
 * Variante de apiFetch qui retourne un binaire (PDF…) encodé en base64.
 * Utilisée pour récupérer les PDF générés (CV, lettre) et les stocker en
 * vue de l'upload dans les formulaires.
 *
 * @param {string} endpoint
 * @param {RequestInit} options
 * @returns {Promise<{ base64: string, contentType: string, fileName: string }>}
 */
async function apiFetchBinary(endpoint, options) {
  options = options || {};

  const baseUrl = (await Storage.getApiBaseUrl()) || API_BASE_URL;
  const token = await Storage.getToken();

  const headers = Object.assign(
    { "Content-Type": "application/json" },
    token ? { Authorization: "Bearer " + token } : {},
    options.headers || {},
  );

  const url = baseUrl + endpoint;

  let response;
  try {
    response = await fetch(url, Object.assign({}, options, { headers }));
  } catch (networkError) {
    Logger.error("Erreur réseau (binaire) vers " + url, networkError);
    throw new Error("Impossible de joindre l'API CVGen. Vérifiez votre connexion.");
  }

  if (response.status === 401 || response.status === 403) {
    try { chrome.runtime.sendMessage({ type: "TOKEN_EXPIRED" }); } catch (_) {}
    throw new Error("Session expirée. Reconnectez-vous dans l'extension puis réessayez.");
  }

  if (!response.ok) {
    throw new Error("Erreur API " + response.status + " (binaire): " + response.statusText);
  }

  const contentType = response.headers.get("Content-Type") || "application/pdf";

  // Nom de fichier depuis Content-Disposition si présent
  let fileName = "";
  const dispo = response.headers.get("Content-Disposition") || "";
  const m = dispo.match(/filename\*?=(?:UTF-8'')?"?([^\";]+)"?/i);
  if (m) fileName = decodeURIComponent(m[1]);

  const buffer = await response.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  return { base64: base64, contentType: contentType, fileName: fileName };
}

/**
 * Convertit un ArrayBuffer en base64 par paquets pour éviter le dépassement
 * de pile de String.fromCharCode sur les gros fichiers.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32 Ko
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
