/**
 * CVGen File Uploader
 * Upload de fichiers (CV, lettre de motivation) dans les <input type="file">
 * à partir d'un contenu base64.
 *
 * Traverse le shadow DOM récursivement.
 * Exposé via : window.FileUploader = { upload, findCVInput, findCoverLetterInput }
 */

var FileUploader = (function () {
  'use strict';

  // ─── Traversée du Shadow DOM ───────────────────────────────────────────────

  function querySelectorAllDeep(root, selector) {
    var results = [];
    try {
      var found = root.querySelectorAll(selector);
      for (var i = 0; i < found.length; i++) results.push(found[i]);
    } catch (_) {}

    var allElements = root.querySelectorAll('*');
    for (var j = 0; j < allElements.length; j++) {
      var el = allElements[j];
      if (el.shadowRoot) {
        var shadowResults = querySelectorAllDeep(el.shadowRoot, selector);
        for (var k = 0; k < shadowResults.length; k++) {
          results.push(shadowResults[k]);
        }
      }
    }
    return results;
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  /**
   * Injecte un fichier (base64) dans un <input type="file">.
   *
   * @param {HTMLInputElement} inputElement - L'input file cible
   * @param {string} base64String - Contenu du fichier en base64
   * @param {string} filename - Nom du fichier (ex: "CV_Jean_Dupont.pdf")
   * @param {string} [mimeType='application/pdf'] - Type MIME
   * @returns {boolean} true si réussi
   */
  function upload(inputElement, base64String, filename, mimeType) {
    mimeType = mimeType || guessMimeType(filename);

    try {
      // 1. Décoder base64 → ArrayBuffer
      var binaryStr = atob(base64String);
      var bytes = new Uint8Array(binaryStr.length);
      for (var i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      // 2. Créer le Blob puis le File
      var blob = new Blob([bytes.buffer], { type: mimeType });
      var file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });

      // 3. Créer un DataTransfer et y ajouter le File
      var dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      // 4. Assigner au champ (via setter natif si possible pour traverser React/Vue)
      try {
        var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
        if (desc && desc.set) {
          desc.set.call(inputElement, dataTransfer.files);
        } else {
          inputElement.files = dataTransfer.files;
        }
      } catch (_) {
        inputElement.files = dataTransfer.files;
      }

      // 5. Déclencher les événements (focus → input → change → blur pour SF/Workday)
      try { inputElement.dispatchEvent(new FocusEvent('focus',    { bubbles: true })); } catch (_) {}
      inputElement.dispatchEvent(new Event('input',  { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      try { inputElement.dispatchEvent(new FocusEvent('blur',     { bubbles: true })); } catch (_) {}

      // 6. Vérification : le fichier est-il bien dans l'input ?
      var ok = inputElement.files && inputElement.files.length > 0 &&
               inputElement.files[0].name === filename;

      Logger.log(
        'Fichier uploadé: ' + filename +
        ' (' + Math.round(bytes.length / 1024) + ' Ko, ' + mimeType + ')' +
        (ok ? ' ✓ vérifié' : ' ⚠ non vérifié dans input.files')
      );
      return true;

    } catch (err) {
      Logger.error('Erreur upload fichier', err);
      return false;
    }
  }

  function guessMimeType(filename) {
    if (!filename) return 'application/pdf';
    var ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':  return 'application/pdf';
      case 'doc':  return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'odt':  return 'application/vnd.oasis.opendocument.text';
      case 'rtf':  return 'application/rtf';
      case 'txt':  return 'text/plain';
      case 'png':  return 'image/png';
      case 'jpg':  case 'jpeg': return 'image/jpeg';
      default:     return 'application/pdf';
    }
  }

  // ─── Recherche d'inputs file ───────────────────────────────────────────────

  var CV_KEYWORDS      = ['cv', 'resume', 'curriculum', 'curriculum vitae', 'lebenslauf'];
  var LETTER_KEYWORDS  = ['lettre', 'cover', 'motivation', 'letter', 'cover letter', 'lettre de motivation', 'anschreiben'];

  /**
   * Cherche le texte associé à un input file (label, aria-label, accept, texte parent).
   */
  function getInputContext(input) {
    var texts = [];

    // accept attribute
    texts.push(input.getAttribute('accept') || '');
    texts.push(input.getAttribute('name') || '');
    texts.push(input.getAttribute('id') || '');
    texts.push(input.getAttribute('aria-label') || '');
    texts.push(input.getAttribute('aria-labelledby') || '');
    texts.push(input.getAttribute('data-label') || '');
    texts.push(input.getAttribute('data-testid') || '');
    texts.push(input.getAttribute('data-bind') || '');
    texts.push(input.getAttribute('title') || '');
    texts.push(input.getAttribute('placeholder') || '');

    // Label via for/id
    var id = input.getAttribute('id');
    if (id) {
      try {
        var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (label) texts.push(label.innerText || label.textContent || '');
      } catch (_) {}
    }

    // Label via aria-labelledby
    var labelledBy = input.getAttribute('aria-labelledby');
    if (labelledBy) {
      var ids = labelledBy.split(/\s+/);
      for (var k = 0; k < ids.length; k++) {
        try {
          var refEl = document.getElementById(ids[k]);
          if (refEl) texts.push(refEl.innerText || refEl.textContent || '');
        } catch (_) {}
      }
    }

    // Label parent
    var parentLabel = input.closest('label');
    if (parentLabel) {
      texts.push(parentLabel.innerText || parentLabel.textContent || '');
    }

    // Texte du parent (jusqu'à 5 niveaux pour capter les tuiles SF/Workday)
    var parent = input.parentElement;
    for (var level = 0; level < 5 && parent; level++) {
      var clone = parent.cloneNode(true);
      clone.querySelectorAll('input, button, script, style').forEach(function (el) { el.remove(); });
      texts.push((clone.innerText || clone.textContent || '').substring(0, 300));
      parent = parent.parentElement;
    }

    return texts.join(' ').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Détecte si la "tuile/zone" autour d'un input file contient déjà un fichier
   * (nom de fichier visible, .pdf/.docx, etc.). Utile pour ne pas écraser un
   * CV déjà uploadé sur SF/Workday.
   */
  function isInputAlreadyFilled(input) {
    if (!input) return false;
    if (input.files && input.files.length > 0) return true;
    var parent = input.parentElement;
    for (var lvl = 0; lvl < 5 && parent; lvl++) {
      var txt = (parent.innerText || parent.textContent || '').toLowerCase();
      if (/\.(pdf|docx?|odt|rtf|txt|png|jpe?g)\b/.test(txt)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function matchesKeywords(context, keywords) {
    for (var i = 0; i < keywords.length; i++) {
      if (context.includes(keywords[i])) return true;
    }
    return false;
  }

  /**
   * Retourne tous les <input type="file"> non désactivés, y compris ceux
   * cachés derrière des wrappers (drag-drop). Les inputs "hidden" ou
   * "display:none" sont gardés volontairement : ils sont la cible standard
   * des drag-drop personnalisés et acceptent un .files = ... programmatique.
   */
  function getAllFileInputs() {
    var raw = querySelectorAllDeep(document, 'input[type="file"]');
    var result = [];
    for (var i = 0; i < raw.length; i++) {
      var inp = raw[i];
      if (!inp || inp.disabled) continue;
      result.push(inp);
    }
    return result;
  }

  /**
   * Trouve l'input file pour le CV.
   * @returns {HTMLInputElement|null}
   */
  function findCVInput() {
    var fileInputs = getAllFileInputs();

    // 1. Chercher par label/contexte explicite (CV mais pas lettre)
    for (var i = 0; i < fileInputs.length; i++) {
      var ctx = getInputContext(fileInputs[i]);
      if (matchesKeywords(ctx, CV_KEYWORDS) && !matchesKeywords(ctx, LETTER_KEYWORDS)) {
        return fileInputs[i];
      }
    }

    // 2. Sinon premier qui n'est PAS clairement une lettre
    for (var j = 0; j < fileInputs.length; j++) {
      var ctx2 = getInputContext(fileInputs[j]);
      if (!matchesKeywords(ctx2, LETTER_KEYWORDS)) {
        return fileInputs[j];
      }
    }

    // 3. Sinon le premier
    if (fileInputs.length > 0) return fileInputs[0];

    return null;
  }

  /**
   * Trouve l'input file pour la lettre de motivation.
   * @returns {HTMLInputElement|null}
   */
  function findCoverLetterInput() {
    var fileInputs = getAllFileInputs();

    // 1. Chercher par label/contexte explicite
    for (var i = 0; i < fileInputs.length; i++) {
      var ctx = getInputContext(fileInputs[i]);
      if (matchesKeywords(ctx, LETTER_KEYWORDS)) {
        return fileInputs[i];
      }
    }

    // 2. Si aucun label clair et 2+ inputs : second qui n'est pas le CV
    if (fileInputs.length >= 2) {
      var cvInput = findCVInput();
      for (var j = 0; j < fileInputs.length; j++) {
        if (fileInputs[j] !== cvInput) return fileInputs[j];
      }
    }

    return null;
  }

  return {
    upload: upload,
    findCVInput: findCVInput,
    findCoverLetterInput: findCoverLetterInput,
    isInputAlreadyFilled: isInputAlreadyFilled
  };
})();

window.FileUploader = FileUploader;
