/**
 * CVGen Content Script — Point d'entrée
 * Injecté dans toutes les pages via manifest.json.
 * Dépend de : logger.js, storage.js, field-detector.js, field-mapper.js, field-filler.js
 *             (chargés avant dans l'ordre défini par le manifest)
 */

(function () {
  'use strict';

  var CVGEN_INITIALIZED = '__cvgen_initialized__';

  // Éviter les doubles injections (ex : SPA avec navigation)
  if (window[CVGEN_INITIALIZED]) return;
  window[CVGEN_INITIALIZED] = true;

  Logger.log('Content script initialisé sur ' + window.location.hostname);

  // ─── Écoute des messages du popup ──────────────────────────────────────────

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.type) {

      case 'FILL_FORM':
        handleFillForm(message.options || {})
          .then(function (result) { sendResponse(result); })
          .catch(function (err) {
            Logger.error('FILL_FORM error', err);
            sendResponse({ success: false, error: err.message });
          });
        return true; // réponse asynchrone

      case 'DETECT_FIELDS':
        try {
          var fields = detectAllFields();
          sendResponse({ success: true, fields: fields, site: detectCurrentSite() });
        } catch (err) {
          sendResponse({ success: false, fields: [], error: err.message });
        }
        return false;

      case 'PING':
        sendResponse({ success: true, alive: true });
        return false;
    }
  });

  // ─── Remplissage du formulaire ──────────────────────────────────────────────

  /**
   * Récupère le profil depuis le service worker, scanne la page et remplit les champs.
   *
   * @param {{ overwrite: boolean }} options
   * @returns {Promise<{ success: boolean, filled: number, total: number }>}
   */
  async function handleFillForm(options) {
    var overwrite = options.overwrite === true;
    var hostname  = window.location.hostname;
    var isSF      = hostname.includes('successfactors');

    // 1. Récupérer le profil
    var profileResponse = await new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: 'GET_CACHED_PROFILE' }, resolve);
    });

    if (!profileResponse || !profileResponse.profil) {
      return {
        success: false, filled: 0, total: 0,
        error: profileResponse && profileResponse.error
          ? profileResponse.error
          : 'Profil non disponible. Connectez-vous dans le popup CVGen.'
      };
    }

    var profil      = profileResponse.profil;
    var coverLetter = await Storage.getCoverLetter() || '';
    var filled      = 0;
    var skipped     = 0;

    // 2. Ouvrir les accordéons (SuccessFactors, etc.) et attendre le chargement Ajax
    await expandProfileAccordions();
    await waitForInputs(1500);

    // 3. Scanner tous les champs visibles
    var allInputs    = Array.from(document.querySelectorAll('input, textarea, select'));
    var visibleInputs = allInputs.filter(function (el) { return !shouldIgnore(el); });

    for (var i = 0; i < visibleInputs.length; i++) {
      var el = visibleInputs[i];
      if (!overwrite && isAlreadyFilled(el)) { skipped++; continue; }

      try {
        // ── Champ date JJ/MM/AAAA ──────────────────────────────────────────
        if (isDateField(el)) {
          var fieldType = detectFieldType(el);
          var dateValue = null;
          if (fieldType === 'date_debut') {
            dateValue = (profil.experiences && profil.experiences[0] && profil.experiences[0].dateDebut) || '';
          } else if (fieldType === 'date_fin') {
            dateValue = (profil.experiences && profil.experiences[0] && profil.experiences[0].dateFin) || '';
          } else if (fieldType === 'date_diplome') {
            dateValue = (profil.formations && profil.formations[0] && profil.formations[0].annee) || '';
          }
          if (dateValue) {
            var ok = await fillDateField(el, dateValue);
            if (ok) { showFieldFeedback(el); filled++; }
          }
          continue;
        }

        // ── Custom select SuccessFactors ───────────────────────────────────
        if (isSF && isSFCustomSelect(el)) {
          var sfType = detectFieldType(el);
          var sfValue = null;
          if (sfType === 'niveau_etudes') {
            sfValue = normalizeDiploma((profil.formations && profil.formations[0] && profil.formations[0].niveauEtudes) || (profil.formations && profil.formations[0] && profil.formations[0].diplome) || '');
          } else if (sfType === 'employeur_actuel') {
            sfValue = isCurrentEmployer(profil.experiences && profil.experiences[0]);
          } else if (sfType === 'pays') {
            sfValue = (profil.identite && profil.identite.pays) || 'France';
          } else {
            sfValue = getValueForField(sfType, profil, coverLetter);
          }
          if (sfValue) {
            var sfOk = await fillSFCustomSelect(el, sfValue);
            if (sfOk) { showFieldFeedback(el); filled++; }
          }
          continue;
        }

        // ── Custom dropdown ARIA ───────────────────────────────────────────
        if (isCustomDropdown(el)) {
          var cdType  = detectFieldType(el);
          var cdValue = getValueForField(cdType, profil, coverLetter);
          if (cdValue) {
            var cdOk = await fillCustomDropdown(el, cdValue);
            if (cdOk) { showFieldFeedback(el); filled++; }
          }
          continue;
        }

        // ── Select natif ───────────────────────────────────────────────────
        if (el.tagName === 'SELECT') {
          var selType  = detectFieldType(el);
          var selValue = getValueForField(selType, profil, coverLetter);
          if (selValue) {
            var selOk = fillSelectField(el, selValue);
            if (selOk) { showFieldFeedback(el); filled++; }
          }
          continue;
        }

        // ── Input / textarea classique ─────────────────────────────────────
        var stdType  = detectFieldType(el);
        if (!stdType) continue;
        var stdValue = getValueForField(stdType, profil, coverLetter);
        if (!stdValue) { if (stdType === 'lettre_motivation') Logger.warn('Lettre non disponible'); continue; }

        if (el.tagName === 'TEXTAREA') fillTextareaField(el, stdValue);
        else fillInputField(el, stdValue);
        showFieldFeedback(el);
        filled++;
        Logger.debug('Rempli: ' + stdType + ' = ' + (stdType === 'email' ? '[email]' : stdValue.substring(0, 20)));

      } catch (fillErr) {
        Logger.error('Erreur remplissage', fillErr);
      }
    }

    // 4. Sections dynamiques (Expériences, Formations)
    var expFilled = 0, formFilled = 0;
    try {
      expFilled  = await fillExperienceSections(profil);
      formFilled = await fillFormationSections(profil);
    } catch (dynErr) {
      Logger.warn('Sections dynamiques : ' + dynErr.message);
    }

    var totalFilled = filled + expFilled + formFilled;
    showCompletionToast(totalFilled, visibleInputs.length);
    Logger.log('Terminé: ' + filled + ' standards + ' + expFilled + ' exp + ' + formFilled + ' form, ' + skipped + ' ignorés');

    return { success: true, filled: totalFilled, total: visibleInputs.length, skipped: skipped };
  }

  // ─── Ouverture des accordéons de profil (SuccessFactors, etc.) ────────────

  /**
   * Cherche et ouvre les accordéons "Informations sur le profil" qui
   * contiennent les champs de base (prénom, nom, email, etc.)
   */
  async function expandProfileAccordions() {
    var profileSectionKeywords = [
      'informations sur le profil', 'informations personnelles',
      'coordonnées', 'données personnelles', 'mes informations',
      'personal information', 'contact information', 'basic information'
    ];

    var candidates = Array.from(document.querySelectorAll(
      'button, [role="button"], summary, a, h2, h3, h4, ' +
      '[class*="accordion"], [class*="section-header"], [class*="panel-title"]'
    ));

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var text = normalize(el.innerText || el.textContent || '');
      for (var j = 0; j < profileSectionKeywords.length; j++) {
        if (text.includes(normalize(profileSectionKeywords[j]))) {
          var isCollapsed =
            el.getAttribute('aria-expanded') === 'false' ||
            el.classList.contains('collapsed') ||
            el.closest('[aria-expanded="false"]') !== null;
          if (isCollapsed) {
            el.click();
            await new Promise(function (r) { setTimeout(r, 1500); });
          }
          break;
        }
      }
    }
  }

  /**
   * Attend que des inputs apparaissent dans le DOM (jusqu'à timeoutMs).
   * Utile pour les pages qui chargent les champs en Ajax après ouverture d'accordéon.
   */
  function waitForInputs(timeoutMs) {
    return new Promise(function (resolve) {
      // Si des inputs sont déjà là, on attend juste un peu pour le rendu
      var existing = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
      if (existing.length > 2) {
        setTimeout(resolve, 300);
        return;
      }

      var deadline = Date.now() + timeoutMs;
      var observer = new MutationObserver(function () {
        var inputs = document.querySelectorAll('input:not([type="hidden"]), textarea, select');
        if (inputs.length > 2 || Date.now() >= deadline) {
          observer.disconnect();
          resolve();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Timeout de sécurité
      setTimeout(function () {
        observer.disconnect();
        resolve();
      }, timeoutMs);
    });
  }

  // ─── Détection des champs (pour le popup) ──────────────────────────────────

  /**
   * Retourne la liste des champs de formulaire reconnus sur la page courante.
   * Utilisé par le popup pour afficher l'aperçu "Champs détectés".
   *
   * @returns {Array<{ type: string, label: string, tag: string }>}
   */
  function detectAllFields() {
    var allInputs = Array.from(document.querySelectorAll('input, textarea, select'));
    var results = [];

    allInputs
      .filter(function (el) { return !shouldIgnore(el); })
      .forEach(function (el) {
        var type = detectFieldType(el);
        if (!type) return;

        var label =
          el.getAttribute('placeholder') ||
          el.getAttribute('aria-label') ||
          el.getAttribute('name') ||
          el.getAttribute('id') ||
          '';

        results.push({
          type: type,
          label: label,
          tag: el.tagName.toLowerCase()
        });
      });

    return results;
  }

})();
