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
    mimeType = mimeType || 'application/pdf';

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

      // 4. Assigner au champ
      inputElement.files = dataTransfer.files;

      // 5. Déclencher les événements
      inputElement.dispatchEvent(new Event('input',  { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));

      Logger.log('Fichier uploadé: ' + filename + ' (' + Math.round(bytes.length / 1024) + ' Ko)');
      return true;

    } catch (err) {
      Logger.error('Erreur upload fichier', err);
      return false;
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
    texts.push(input.getAttribute('data-label') || '');
    texts.push(input.getAttribute('data-testid') || '');

    // Label via for/id
    var id = input.getAttribute('id');
    if (id) {
      try {
        var label = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (label) texts.push(label.innerText || label.textContent || '');
      } catch (_) {}
    }

    // Label parent
    var parentLabel = input.closest('label');
    if (parentLabel) {
      texts.push(parentLabel.innerText || parentLabel.textContent || '');
    }

    // Texte du parent (jusqu'à 3 niveaux)
    var parent = input.parentElement;
    for (var level = 0; level < 3 && parent; level++) {
      var clone = parent.cloneNode(true);
      clone.querySelectorAll('input, button, script, style').forEach(function (el) { el.remove(); });
      texts.push((clone.innerText || clone.textContent || '').substring(0, 200));
      parent = parent.parentElement;
    }

    return texts.join(' ').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function matchesKeywords(context, keywords) {
    for (var i = 0; i < keywords.length; i++) {
      if (context.includes(keywords[i])) return true;
    }
    return false;
  }

  /**
   * Trouve l'input file pour le CV.
   * @returns {HTMLInputElement|null}
   */
  function findCVInput() {
    var fileInputs = querySelectorAllDeep(document, 'input[type="file"]');

    // 1. Chercher par label/contexte explicite
    for (var i = 0; i < fileInputs.length; i++) {
      var ctx = getInputContext(fileInputs[i]);
      if (matchesKeywords(ctx, CV_KEYWORDS) && !matchesKeywords(ctx, LETTER_KEYWORDS)) {
        return fileInputs[i];
      }
    }

    // 2. Si aucun label clair, premier input file = CV
    if (fileInputs.length > 0) return fileInputs[0];

    return null;
  }

  /**
   * Trouve l'input file pour la lettre de motivation.
   * @returns {HTMLInputElement|null}
   */
  function findCoverLetterInput() {
    var fileInputs = querySelectorAllDeep(document, 'input[type="file"]');

    // 1. Chercher par label/contexte explicite
    for (var i = 0; i < fileInputs.length; i++) {
      var ctx = getInputContext(fileInputs[i]);
      if (matchesKeywords(ctx, LETTER_KEYWORDS)) {
        return fileInputs[i];
      }
    }

    // 2. Si aucun label clair et 2+ inputs : second = lettre
    if (fileInputs.length >= 2) return fileInputs[1];

    return null;
  }

  return {
    upload: upload,
    findCVInput: findCVInput,
    findCoverLetterInput: findCoverLetterInput
  };
})();

window.FileUploader = FileUploader;
