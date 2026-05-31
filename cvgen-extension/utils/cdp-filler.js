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

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function attachOnce(tabId) {
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

  // Attache robuste : si une session précédente est restée accrochée
  // ("Another debugger is already attached"), on détache puis on réessaie.
  async function attach(tabId) {
    try {
      await attachOnce(tabId);
      return;
    } catch (e1) {
      var msg = (e1 && e1.message) || "";
      if (/already attached|already being debugged/i.test(msg)) {
        await detach(tabId);
        await sleep(300);
        await attachOnce(tabId); // si ça échoue encore, on laisse remonter
        return;
      }
      throw e1;
    }
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

  // Setter natif + événements composés. Utilisé UNIQUEMENT en dernier recours si
  // la frappe clavier "trusted" n'a rien donné (ex. focus impossible). Ce chemin
  // ne met pas toujours à jour le modèle Angular (événements non "trusted"), d'où
  // la priorité donnée à la frappe clavier réelle ci-dessous.
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
        ok: true, tag: el.tagName, type: el.type || "", name: el.name || el.id || "",
        readOnly: !!el.readOnly, disabled: !!el.disabled,
        visible: !!(rect.width > 0 && rect.height > 0), value: el.value,
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  };

  // Exécutée DANS la page sur le vrai <input> : valide la saisie (change + blur)
  // et renvoie un diagnostic (sans modifier la valeur — la frappe l'a déjà fait).
  var DIAG_FN = function () {
    try {
      var el = this;
      el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
      el.dispatchEvent(new Event("blur", { bubbles: true, composed: true }));
      var rect = el.getBoundingClientRect();
      return {
        ok: true, tag: el.tagName, type: el.type || "", name: el.name || el.id || "",
        readOnly: !!el.readOnly, disabled: !!el.disabled,
        visible: !!(rect.width > 0 && rect.height > 0), value: el.value,
      };
    } catch (e) {
      return { ok: false, error: String(e && e.message ? e.message : e) };
    }
  };

  // Sélectionne tout (Ctrl+A) puis supprime, en touches "trusted".
  async function clearField(tabId) {
    await send(tabId, "Input.dispatchKeyEvent", {
      type: "keyDown", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
    });
    await send(tabId, "Input.dispatchKeyEvent", {
      type: "keyUp", modifiers: 2, key: "a", code: "KeyA", windowsVirtualKeyCode: 65,
    });
    await send(tabId, "Input.dispatchKeyEvent", {
      type: "keyDown", key: "Delete", code: "Delete", windowsVirtualKeyCode: 46,
    });
    await send(tabId, "Input.dispatchKeyEvent", {
      type: "keyUp", key: "Delete", code: "Delete", windowsVirtualKeyCode: 46,
    });
  }

  // Frappe caractère par caractère en événements clavier "trusted" : c'est la
  // reproduction la plus fidèle d'une vraie saisie, qui met à jour le modèle
  // Angular des composants custom (ControlValueAccessor) — contrairement à un
  // simple setter de .value qui se fait écraser au prochain re-render.
  async function typeChars(tabId, value) {
    var s = String(value);
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      await send(tabId, "Input.dispatchKeyEvent", {
        type: "keyDown", text: ch, unmodifiedText: ch, key: ch,
      });
      await send(tabId, "Input.dispatchKeyEvent", { type: "keyUp", key: ch });
    }
  }

  async function fillNode(tabId, nodeId, value) {
    var str = String(value);

    var resolved = await send(tabId, "DOM.resolveNode", { nodeId: nodeId });
    var objectId = resolved && resolved.object && resolved.object.objectId;
    if (!objectId) return { ok: false, error: "resolveNode sans objectId" };

    // Focus fiable : DOM.focus (niveau CDP, traverse le shadow fermé) + el.focus()
    // exécuté dans la page, pour garantir que la frappe atterrira dans cet input.
    try { await send(tabId, "DOM.focus", { nodeId: nodeId }); } catch (_) {}
    try {
      await send(tabId, "Runtime.callFunctionOn", {
        objectId: objectId,
        functionDeclaration: "function(){ try { this.focus(); } catch(e){} }",
      });
    } catch (_) {}

    // Effacer puis taper la valeur, touche par touche (trusted).
    try {
      await clearField(tabId);
      await typeChars(tabId, str);
    } catch (_) {}

    // Valider (change + blur) et lire la valeur réellement présente.
    var res = await send(tabId, "Runtime.callFunctionOn", {
      objectId: objectId,
      functionDeclaration: "(" + DIAG_FN.toString() + ")",
      returnByValue: true,
    });
    var diag = (res && res.result && res.result.value) || { ok: false, error: "pas de retour" };

    // Dernier recours : si la frappe trusted n'a rien donné, setter natif.
    if (!diag.ok || String(diag.value) !== str) {
      var res2 = await send(tabId, "Runtime.callFunctionOn", {
        objectId: objectId,
        functionDeclaration: "(" + FILL_FN.toString() + ")",
        arguments: [{ value: str }],
        returnByValue: true,
      });
      diag = (res2 && res2.result && res2.result.value) || diag;
    }
    return diag;
  }

  /**
   * fields : [{ formcontrolname, value }]
   * → { success, filled:[noms], failed:[noms], error? }
   */
  // Lit la valeur courante du vrai input (pour vérifier si Angular l'a vidé).
  async function readValue(tabId, nodeId) {
    try {
      var resolved = await send(tabId, "DOM.resolveNode", { nodeId: nodeId });
      var objectId = resolved && resolved.object && resolved.object.objectId;
      if (!objectId) return null;
      var res = await send(tabId, "Runtime.callFunctionOn", {
        objectId: objectId,
        functionDeclaration: "function(){ return this ? this.value : null; }",
        returnByValue: true,
      });
      return res && res.result ? res.result.value : null;
    } catch (_) {
      return null;
    }
  }

  // Angular peut re-render et vider les champs APRÈS le remplissage (re-render
  // tardif déclenché par la dernière sauvegarde d'expérience/formation). On
  // attend donc d'abord que ça se stabilise, puis on re-remplit ce qui a été
  // vidé sur plusieurs passes espacées, sur une fenêtre longue.
  var INITIAL_SETTLE_MS = 1600; // laisser le re-render post-sauvegarde se produire
  var MAX_PASSES = 6;
  var PASS_DELAY_MS = 1500;

  async function fillFields(tabId, fields) {
    var details = [];
    var attached = false;
    var status = {}; // formcontrolname -> 'filled' | 'failed'

    try {
      await attach(tabId);
      attached = true;
      await send(tabId, "DOM.enable", {});

      // Attendre que le formulaire se stabilise (les sauvegardes précédentes
      // déclenchent un re-render qui, sinon, écraserait notre remplissage).
      await sleep(INITIAL_SETTLE_MS);

      for (var pass = 1; pass <= MAX_PASSES; pass++) {
        // Re-scanner l'arbre à chaque passe : si Angular a recréé un input
        // (re-render), son ancien nodeId est périmé.
        var doc = await send(tabId, "DOM.getDocument", { depth: -1, pierce: true });
        var map = {};
        indexOcInputs(doc.root, map);

        var stillNeedWork = false;

        for (var i = 0; i < fields.length; i++) {
          var f = fields[i];
          var nodeId = map[f.formcontrolname];
          if (!nodeId) {
            status[f.formcontrolname] = "failed";
            if (pass === 1) {
              details.push(f.formcontrolname + " → AUCUN input trouvé dans le composant");
            }
            continue;
          }

          // Si la valeur tient déjà, rien à faire pour ce champ cette passe.
          var current = await readValue(tabId, nodeId);
          if (String(current) === String(f.value)) {
            status[f.formcontrolname] = "filled";
            continue;
          }

          try {
            var diag = await fillNode(tabId, nodeId, String(f.value));
            var landed = diag && diag.ok && String(diag.value) === String(f.value);
            status[f.formcontrolname] = landed ? "filled" : "failed";
            if (!landed) stillNeedWork = true;
            if (pass === 1) {
              details.push(
                f.formcontrolname +
                  " → " +
                  (diag && diag.ok
                    ? "input<" + diag.tag + " type=" + diag.type + " name='" + diag.name + "'" +
                      " visible=" + diag.visible + " ro=" + diag.readOnly + " dis=" + diag.disabled + ">" +
                      " valeur=" + JSON.stringify(diag.value)
                    : "ECHEC " + (diag && diag.error)),
              );
            }
          } catch (e) {
            status[f.formcontrolname] = "failed";
            stillNeedWork = true;
            if (pass === 1) {
              details.push(f.formcontrolname + " → exception " + (e && e.message));
            }
          }
        }

        // On laisse Angular « digérer » puis on revérifie à la passe suivante,
        // même si tout semble rempli (un re-render tardif peut encore vider).
        if (pass < MAX_PASSES) await sleep(PASS_DELAY_MS);
        // (on ne sort jamais en avance : on veut survivre aux re-renders tardifs)
        void stillNeedWork;
      }

      var filled = [];
      var failed = [];
      fields.forEach(function (f) {
        (status[f.formcontrolname] === "filled" ? filled : failed).push(f.formcontrolname);
      });
      return { success: true, filled: filled, failed: failed, details: details };
    } catch (err) {
      return {
        success: false,
        error: err.message,
        filled: [],
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
