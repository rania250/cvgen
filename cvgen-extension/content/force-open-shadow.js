/**
 * CVGen — Force open Shadow DOM
 *
 * Certains sites (ex. SmartRecruiters / Sopra Steria avec leurs Web Components
 * <oc-input>) créent leurs champs avec un Shadow DOM en mode "closed", ce qui
 * rend le <input> interne totalement inaccessible aux scripts → impossible à
 * remplir.
 *
 * Ce script intercepte Element.prototype.attachShadow AVANT que la page ne
 * crée ses composants et force le mode "open". Les shadow roots deviennent
 * alors accessibles via element.shadowRoot, et l'autofill peut écrire dans les
 * vrais <input>.
 *
 * IMPORTANT :
 *  - doit s'exécuter en "run_at": "document_start"
 *  - doit s'exécuter dans le monde principal ("world": "MAIN") pour patcher le
 *    Element.prototype RÉEL de la page (et pas celui, isolé, du content script).
 *  - n'affecte que les shadow roots créés APRÈS son exécution.
 *
 * Lecture seule / non destructif : on ne change que le mode d'encapsulation,
 * le comportement fonctionnel des composants reste identique.
 */
(function () {
  "use strict";

  try {
    var proto = Element.prototype;
    var original = proto.attachShadow;

    if (typeof original !== "function" || original.__cvgenForcedOpen) {
      return;
    }

    var patched = function (init) {
      var options = init || {};
      // Forcer l'ouverture : on copie pour ne pas muter l'objet de l'appelant.
      var forced = {};
      for (var k in options) {
        if (Object.prototype.hasOwnProperty.call(options, k)) {
          forced[k] = options[k];
        }
      }
      forced.mode = "open";
      try {
        return original.call(this, forced);
      } catch (e) {
        // En cas de souci, on retombe sur le comportement d'origine.
        return original.call(this, options);
      }
    };

    patched.__cvgenForcedOpen = true;
    proto.attachShadow = patched;

    // Marqueur pour debug (visible dans la console de la page)
    try {
      window.__cvgenShadowForcedOpen = true;
    } catch (_) {}
  } catch (e) {
    // silencieux : ne jamais casser la page
  }
})();
