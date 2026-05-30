/**
 * CVGen — Remplissage via Chrome DevTools Protocol (chrome.debugger)
 *
 * Certains sites (SmartRecruiters / Sopra Steria) rendent leurs champs dans un
 * Shadow DOM en mode "closed" créé par le PARSEUR HTML (Declarative Shadow DOM).
 * Ces <input> sont totalement inaccessibles au JavaScript de la page comme au
 * content script (element.shadowRoot === null). Patcher attachShadow ne sert à
 * rien car la méthode n'est jamais appelée.
 *
 * Le protocole de débogage de Chrome (CDP), lui, peut :
 *  - "percer" les shadow DOM fermés (DOM.getDocument { pierce: true }) ;
 *  - injecter une vraie saisie clavier (Input.insertText) qui génère des
 *    événements *trusted* qu'Angular (ControlValueAccessor) accepte.
 *
 * C'est la même technique que Puppeteer / Playwright.
 *
 * NB : nécessite la permission "debugger". Pendant l'opération, Chrome affiche
 * une barre "CVGen a commencé à déboguer ce navigateur" (normal). L'attache
 * échoue si les DevTools sont déjà ouverts sur l'onglet.
 */
var CdpFiller = (function () {
  "use strict";

  var DEBUGGER_VERSION = "1.3";

  function attach(tabId) {
    return new Promise(function (resolve, reject) {
      chrome.debugger.attach({ tabId: tabId }, DEBUGGER_VERSION, function () {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });
  }

  function detach(tabId) {
    return new Promise(function (resolve) {
      try {
        chrome.debugger.detach({ tabId: tabId }, function () {
          void chrome.runtime.lastError; // ignorer
          resolve();
        });
      } catch (_) {
        resolve();
      }
    });
  }

  function send(tabId, method, params) {
    return new Promise(function (resolve, reject) {
      chrome.debugger.sendCommand({ tabId: tabId }, method, params || {}, function (result) {
        if (chrome.runtime.lastError) {
          reject(new Error(method + " — " + chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  function getAttr(node, name) {
    var attrs = node.attributes || [];
    var target = String(name).toLowerCase();
    for (var i = 0; i + 1 < attrs.length; i += 2) {
      if (String(attrs[i]).toLowerCase() === target) return attrs[i + 1];
    }
    return null;
  }

  /**
   * Cherche récursivement le premier <input>/<textarea> "remplissable" dans un
   * sous-arbre (on ignore les input type=hidden et les boutons), en traversant
   * les enfants, les shadow roots (même fermés) et les iframes.
   */
  function findInnerControl(node) {
    if (!node) return null;
    var ln = (node.localName || node.nodeName || "").toLowerCase();
    if (ln === "textarea") return node;
    if (ln === "input") {
      var type = (getAttr(node, "type") || "text").toLowerCase();
      var skip = { hidden: 1, button: 1, submit: 1, checkbox: 1, radio: 1, file: 1, image: 1, reset: 1 };
      if (!skip[type]) return node;
    }

    var i, found;
    if (node.shadowRoots) {
      for (i = 0; i < node.shadowRoots.length; i++) {
        found = findInnerControl(node.shadowRoots[i]);
        if (found) return found;
      }
    }
    if (node.children) {
      for (i = 0; i < node.children.length; i++) {
        found = findInnerControl(node.children[i]);
        if (found) return found;
      }
    }
    if (node.contentDocument) {
      found = findInnerControl(node.contentDocument);
      if (found) return found;
    }
    return null;
  }

  /**
   * Indexe tous les <oc-input> de l'arbre (formcontrolname → nodeId de l'input
   * interne réel, même dans un shadow fermé).
   */
  function indexOcInputs(root, map) {
    if (!root) return;
    var ln = (root.localName || root.nodeName || "").toLowerCase();
    if (ln === "oc-input") {
      var fcn =
        getAttr(root, "formcontrolname") ||
        getAttr(root, "attrid") ||
        getAttr(root, "data-test");
      if (fcn) {
        var inner = findInnerControl(root);
        if (inner && inner.nodeId) map[fcn] = inner.nodeId;
      }
    }
    var i;
    if (root.shadowRoots) {
      for (i = 0; i < root.shadowRoots.length; i++) indexOcInputs(root.shadowRoots[i], map);
    }
    if (root.children) {
      for (i = 0; i < root.children.length; i++) indexOcInputs(root.children[i], map);
    }
    if (root.contentDocument) indexOcInputs(root.contentDocument, map);
  }

  // Fonction exécutée DANS la page, avec `this` = le vrai <input> (même dans un
  // shadow fermé, grâce à DOM.resolveNode → Runtime.callFunctionOn).
  // 1) frappe "trusted" via Input.insertText (gérée en amont) — ici on complète
  //    avec le setter natif + événements composés (composed:true) pour franchir
  //    les frontières shadow et notifier Angular, et on renvoie un diagnostic.
  var FILL_FN = function (v) {
    try {
      var el = this;
      var proto =
        el.tagName === "TEXTAREA"
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      var desc = Object.getOwnPropertyDescriptor(proto, "value");
      el.focus();
      if (desc && desc.set) {
        desc.set.call(el, v);
      } else {
        el.value = v;
      }
      el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
      var rect = el.getBoundingClientRect();
      return {
        ok: true,
        tag: el.tagName,
        type: el.type || "",
        name: el.name || el.id || "",
        readOnly: !!el.readOnly,
        disabled: !!el.disabled,
        visible: !!(rect.width > 0 && rect.height > 0),
        value: el.value,
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  };

  async function fillNode(tabId, nodeId, value) {
    // Frappe clavier "trusted" d'abord (focus + sélection + insertText) :
    // c'est ce qui fait réagir les composants les plus stricts.
    try {
      await send(tabId, "DOM.focus", { nodeId: nodeId });
      await send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
      });
      await send(tabId, "Input.dispatchKeyEvent", {
        type: "keyUp", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
      });
      await send(tabId, "Input.insertText", { text: String(value) });
    } catch (_) {
      // pas grave : le setter natif ci-dessous prend le relais
    }

    // Puis setter natif + événements composés (au cas où insertText ait visé un
    // input caché/proxy) + diagnostic sur le vrai input ciblé.
    var resolved = await send(tabId, "DOM.resolveNode", { nodeId: nodeId });
    var objectId = resolved && resolved.object && resolved.object.objectId;
    if (!objectId) return { ok: false, error: "resolveNode sans objectId" };

    var res = await send(tabId, "Runtime.callFunctionOn", {
      objectId: objectId,
      functionDeclaration: "(" + FILL_FN.toString() + ")",
      arguments: [{ value: String(value) }],
      returnByValue: true,
    });
    return (res && res.result && res.result.value) || { ok: false, error: "pas de retour" };
  }

  /**
   * fields : [{ formcontrolname, value }]
   * → { success, filled:[noms], failed:[noms], error? }
   */
  async function fillFields(tabId, fields) {
    var filled = [];
    var failed = [];
    var details = [];
    var attached = false;
    try {
      await attach(tabId);
      attached = true;
      await send(tabId, "DOM.enable", {});

      var doc = await send(tabId, "DOM.getDocument", { depth: -1, pierce: true });
      var map = {};
      indexOcInputs(doc.root, map);

      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var nodeId = map[f.formcontrolname];
        if (!nodeId) {
          failed.push(f.formcontrolname);
          details.push(f.formcontrolname + " → AUCUN input trouvé dans le composant");
          continue;
        }
        try {
          var diag = await fillNode(tabId, nodeId, String(f.value));
          // On considère "rempli" si le vrai input contient bien la valeur.
          var landed = diag && diag.ok && String(diag.value) === String(f.value);
          if (landed) {
            filled.push(f.formcontrolname);
          } else {
            failed.push(f.formcontrolname);
          }
          details.push(
            f.formcontrolname +
              " → " +
              (diag && diag.ok
                ? "input<" + diag.tag + " type=" + diag.type + " name='" + diag.name + "'" +
                  " visible=" + diag.visible + " ro=" + diag.readOnly + " dis=" + diag.disabled + ">" +
                  " valeur=" + JSON.stringify(diag.value)
                : "ECHEC " + (diag && diag.error)),
          );
        } catch (e) {
          failed.push(f.formcontrolname);
          details.push(f.formcontrolname + " → exception " + (e && e.message));
        }
      }
      return { success: true, filled: filled, failed: failed, details: details };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        filled: filled,
        failed: fields.map(function (f) {
          return f.formcontrolname;
        }),
        details: details,
      };
    } finally {
      if (attached) await detach(tabId);
    }
  }

  return { fillFields: fillFields };
})();

// Exposition pour le service worker (importScripts)
if (typeof self !== "undefined") {
  self.CdpFiller = CdpFiller;
}
