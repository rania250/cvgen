/**
 * CVGen Submit Handler
 * Localise et clique le bouton de soumission finale d'une candidature, selon
 * l'ATS courant. Traverse le Shadow DOM (Web Components type SmartRecruiters).
 *
 * Sécurité : ne clique JAMAIS tout seul. Le clic n'est déclenché que sur appel
 * explicite de submit({ confirm: true }) depuis le popup, après confirmation
 * utilisateur.
 *
 * Exposé via : window.SubmitHandler = { findSubmitButton, submit, describe }
 */
var SubmitHandler = (function () {
  "use strict";

  // Libellés indiquant une SOUMISSION FINALE (et non "étape suivante").
  var SUBMIT_TEXTS = [
    "envoyer ma candidature",
    "envoyer la candidature",
    "soumettre ma candidature",
    "soumettre la candidature",
    "soumettre",
    "postuler maintenant",
    "envoyer ma demande",
    "valider ma candidature",
    "confirmer et envoyer",
    "submit application",
    "submit your application",
    "send application",
    "send my application",
    "submit",
    "apply now",
    "complete application",
    "finish and submit",
  ];

  // Libellés à ÉVITER (étapes intermédiaires) sauf si rien d'autre trouvé.
  var NEXT_TEXTS = [
    "suivant",
    "continuer",
    "étape suivante",
    "next",
    "continue",
    "save and continue",
    "review",
  ];

  // Indices spécifiques par ATS (sélecteurs prioritaires)
  var ATS_HINTS = [
    { host: "greenhouse.io", selector: '#submit_app, button#submit_app, button[type="submit"]' },
    { host: "lever.co", selector: 'button.template-btn-submit, button[type="submit"]' },
    { host: "smartrecruiters", selector: 'spl-button, button[type="submit"]' },
    { host: "successfactors", selector: 'button, a[role="button"], input[type="submit"]' },
    { host: "myworkdayjobs", selector: '[data-automation-id="submitButton"], [data-automation-id*="submit"]' },
    { host: "workday", selector: '[data-automation-id*="submit"]' },
    { host: "icims", selector: 'input[type="submit"], button[type="submit"]' },
    { host: "taleo", selector: 'input[type="submit"], button[type="submit"]' },
    { host: "jobvite", selector: 'button[type="submit"], input[type="submit"]' },
    { host: "welcometothejungle", selector: 'button[type="submit"]' },
    { host: "indeed", selector: 'button[data-testid*="apply"], button[type="submit"]' },
  ];

  function deepQueryAll(root, selector) {
    if (typeof querySelectorAllDeep === "function") {
      return querySelectorAllDeep(root, selector);
    }
    // Repli local si querySelectorAllDeep n'est pas chargé
    var results = [];
    try {
      var found = root.querySelectorAll(selector);
      for (var i = 0; i < found.length; i++) results.push(found[i]);
    } catch (_) {}
    var all;
    try { all = root.querySelectorAll("*"); } catch (_) { return results; }
    for (var j = 0; j < all.length; j++) {
      if (all[j].shadowRoot) {
        var sub = deepQueryAll(all[j].shadowRoot, selector);
        for (var k = 0; k < sub.length; k++) results.push(sub[k]);
      }
    }
    return results;
  }

  function btnText(el) {
    return (
      (el.innerText || el.textContent || "") +
      " " +
      (el.getAttribute && el.getAttribute("aria-label") || "") +
      " " +
      (el.value || "")
    )
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isVisible(el) {
    try {
      var style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    } catch (_) {
      return true;
    }
  }

  function matchesAny(text, patterns) {
    for (var i = 0; i < patterns.length; i++) {
      if (text.indexOf(patterns[i]) !== -1) return true;
    }
    return false;
  }

  /**
   * Trouve le meilleur bouton de soumission. Retourne null si introuvable.
   */
  function findSubmitButton() {
    var host = window.location.hostname;
    var hint = null;
    for (var h = 0; h < ATS_HINTS.length; h++) {
      if (host.indexOf(ATS_HINTS[h].host) !== -1) { hint = ATS_HINTS[h]; break; }
    }

    var selector =
      (hint ? hint.selector + ", " : "") +
      'button, [role="button"], input[type="submit"], input[type="button"], a[role="button"], spl-button';

    var candidates = deepQueryAll(document, selector);

    var submitMatch = null;
    var nextMatch = null;

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!isVisible(el)) continue;
      if (el.disabled) continue;
      var txt = btnText(el);
      if (!txt) continue;

      if (!submitMatch && matchesAny(txt, SUBMIT_TEXTS)) {
        submitMatch = el;
      } else if (!nextMatch && matchesAny(txt, NEXT_TEXTS)) {
        nextMatch = el;
      }
    }

    // Priorité : vrai bouton de soumission, sinon bouton "suivant" (multi-étapes)
    return submitMatch || nextMatch || null;
  }

  /**
   * Décrit le bouton trouvé (sans cliquer). Pour l'aperçu côté popup.
   */
  function describe() {
    var btn = findSubmitButton();
    if (!btn) return { found: false };
    return {
      found: true,
      label: (btn.innerText || btn.value || btn.getAttribute("aria-label") || "").trim().substring(0, 60),
      tag: btn.tagName.toLowerCase(),
    };
  }

  /**
   * Clique le bouton de soumission.
   * @param {{ confirm: boolean }} options - confirm doit être true.
   */
  async function submit(options) {
    options = options || {};
    if (options.confirm !== true) {
      return { success: false, error: "Confirmation requise avant soumission." };
    }
    var btn = findSubmitButton();
    if (!btn) {
      return { success: false, error: "Bouton d'envoi introuvable sur cette page." };
    }

    var label = (btn.innerText || btn.value || "").trim().substring(0, 60);
    try { btn.scrollIntoView({ block: "center" }); } catch (_) {}
    try { btn.focus(); } catch (_) {}

    try {
      if (typeof btn.click === "function") {
        btn.click();
      } else {
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      }
    } catch (err) {
      return { success: false, error: "Échec du clic : " + err.message };
    }

    await new Promise(function (r) { setTimeout(r, 400); });
    return { success: true, submittedAt: new Date().toISOString(), label: label };
  }

  return { findSubmitButton: findSubmitButton, submit: submit, describe: describe };
})();

window.SubmitHandler = SubmitHandler;
