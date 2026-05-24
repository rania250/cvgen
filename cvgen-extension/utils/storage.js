/**
 * CVGen Storage
 * Wrapper autour de chrome.storage.local.
 * Règle absolue : ne jamais utiliser localStorage ou sessionStorage.
 */

var Storage = {
  /**
   * Récupère une valeur par clé.
   * @param {string} key
   * @returns {Promise<any>}
   */
  async get(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
  },

  /**
   * Stocke une paire clé/valeur.
   * @param {string} key
   * @param {any} value
   * @returns {Promise<void>}
   */
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },

  /**
   * Supprime une ou plusieurs clés.
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  async remove(keys) {
    await chrome.storage.local.remove(keys);
  },

  /**
   * Vide tout le storage.
   * @returns {Promise<void>}
   */
  async clear() {
    await chrome.storage.local.clear();
  },

  // ── Helpers métier ────────────────────────────────────────────────────────

  async getToken() {
    return this.get("token");
  },

  async setToken(token) {
    return this.set("token", token);
  },

  async removeToken() {
    return this.remove("token");
  },

  async getUser() {
    return this.get("user");
  },

  async setUser(user) {
    return this.set("user", user);
  },

  async getProfile() {
    return this.get("profil");
  },

  async setProfile(profil) {
    return this.set("profil", profil);
  },

  async getProfileSyncDate() {
    return this.get("profileSyncDate");
  },

  async setProfileSyncDate(date) {
    return this.set("profileSyncDate", date);
  },

  async getCoverLetter() {
    // Migration : ancienne clé "lettreMutation" (typo) vers "lettreMotivation"
    const current = await this.get("lettreMotivation");
    if (current) return current;
    const legacy = await this.get("lettreMutation");
    if (legacy) {
      await this.set("lettreMotivation", legacy);
      await this.remove("lettreMutation");
      return legacy;
    }
    return undefined;
  },

  async setCoverLetter(lettre) {
    return this.set("lettreMotivation", lettre);
  },

  /**
   * Récupère l'URL de base de l'API (depuis les options utilisateur ou valeur par défaut).
   * @returns {Promise<string>}
   */
  async getApiBaseUrl() {
    const url = await this.get("apiBaseUrl");
    return url || "https://api.cvgen.fr";
  },

  async setApiBaseUrl(url) {
    return this.set("apiBaseUrl", url);
  },
};
