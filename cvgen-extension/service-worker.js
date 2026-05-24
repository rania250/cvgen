/**
 * CVGen Service Worker (background)
 * Point unique de contact avec l'API CVGen.
 * Les content scripts et le popup NE font jamais d'appels réseau directs.
 *
 * Placé à la racine de l'extension pour que importScripts() fonctionne
 * avec des chemins simples sans ambiguïté.
 */

importScripts("utils/logger.js", "utils/storage.js", "utils/api-client.js");

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
