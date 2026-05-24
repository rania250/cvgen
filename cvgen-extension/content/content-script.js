/**
 * CVGen Content Script — Point d'entrée
 * Injecté dans toutes les pages via manifest.json.
 * Dépend de : logger.js, storage.js, field-detector.js, field-mapper.js,
 *             field-filler.js, dynamic-sections.js, date-handler.js,
 *             offer-extractor.js, file-uploader.js
 *             (chargés avant dans l'ordre défini par le manifest)
 */

(function () {
  "use strict";

  var CVGEN_INITIALIZED = "__cvgen_initialized__";

  // Éviter les doubles injections (ex : SPA avec navigation)
  if (window[CVGEN_INITIALIZED]) return;
  window[CVGEN_INITIALIZED] = true;

  Logger.log("Content script initialisé sur " + window.location.hostname);

  // ─── Normalisation du profil API → format interne extension ────────────────
  // L'API backend retourne des champs en anglais camelCase
  // L'extension attend des champs en français (identite.prenom, experiences[].poste, etc.)

  function normalizeProfileFromAPI(apiProfil, user) {
    if (!apiProfil) return {};
    // Unwrap le wrapper ApiResponse { success, data, message } si présent
    if (apiProfil.data && typeof apiProfil.data === "object" && !Array.isArray(apiProfil.data)) {
      Logger.debug("Unwrap ApiResponse wrapper");
      apiProfil = apiProfil.data;
    }
    // Si le profil a déjà un objet identite, il est déjà normalisé
    if (apiProfil.identite && apiProfil.identite.prenom) return apiProfil;

    var u = user || {};

    // Construire l'objet identite à partir de user + profil
    var identite = {
      prenom: u.prenom || u.firstName || apiProfil.firstName || "",
      nom: u.nom || u.lastName || apiProfil.lastName || "",
      email: u.email || apiProfil.email || "",
      telephone: apiProfil.phone || apiProfil.telephone || "",
      adresse: apiProfil.address || apiProfil.adresse || "",
      ville: (apiProfil.location || "").split(",")[0].trim() || apiProfil.ville || "",
      codePostal: apiProfil.postalCode || apiProfil.codePostal || "",
      pays: apiProfil.country || apiProfil.pays || "France",
      region: apiProfil.region || "",
      linkedin: apiProfil.linkedinUrl || apiProfil.linkedin || "",
      portfolio: apiProfil.portfolioUrl || apiProfil.portfolio || "",
      github: apiProfil.githubUrl || apiProfil.github || "",
      genre: apiProfil.gender || apiProfil.genre || "",
      dateNaissance: apiProfil.birthDate || apiProfil.dateNaissance || "",
      nationalite: apiProfil.nationality || apiProfil.nationalite || "",
      permis: apiProfil.drivingLicense || apiProfil.permis || "",
    };
    identite.nomComplet = (identite.prenom + " " + identite.nom).trim();

    // Transformer les expériences (anglais → français)
    var experiences = (apiProfil.experiences || []).map(function (exp) {
      return {
        poste: exp.jobTitle || exp.poste || exp.title || "",
        entreprise: exp.company || exp.entreprise || exp.organization || "",
        dateDebut: exp.startDate || exp.dateDebut || "",
        dateFin: exp.endDate || exp.dateFin || "",
        lieu: exp.location || exp.lieu || "",
        description: exp.description || "",
        actuel: exp.current || exp.actuel || false,
      };
    });

    // Transformer les formations/educations (anglais → français)
    var formations = (apiProfil.educations || apiProfil.formations || []).map(function (edu) {
      return {
        diplome: edu.degree || edu.diplome || "",
        etablissement: edu.school || edu.etablissement || edu.institution || "",
        mention: edu.fieldOfStudy || edu.mention || edu.domaine || "",
        dateDebut: edu.startDate || edu.dateDebut || "",
        dateFin: edu.endDate || edu.dateFin || "",
        annee: edu.endDate || edu.dateFin || edu.annee || "",
        niveauEtudes: edu.degreeLevel || edu.niveauEtudes || edu.degree || "",
        description: edu.description || "",
      };
    });

    // Transformer les compétences
    var competences = (apiProfil.skills || apiProfil.competences || []).map(function (s) {
      return typeof s === "string" ? s : (s.name || s.nom || s.skill || "");
    }).filter(Boolean);

    // Transformer les langues
    var langues = (apiProfil.languages || apiProfil.langues || []).map(function (l) {
      return typeof l === "string" ? l : (l.name || l.nom || l.language || l.langue || "");
    }).filter(Boolean);

    return {
      identite: identite,
      titrePoste: apiProfil.title || apiProfil.titrePoste || "",
      resumeProfessionnel: apiProfil.summary || apiProfil.resumeProfessionnel || "",
      telephone: identite.telephone,
      experiences: experiences,
      formations: formations,
      competences: competences,
      langues: langues,
      disponibilite: apiProfil.availability || apiProfil.disponibilite || "",
      pretentionSalariale: apiProfil.expectedSalary || apiProfil.pretentionSalariale || "",
      typeContrat: apiProfil.contractType || apiProfil.typeContrat || "",
      anneesExperience: apiProfil.yearsOfExperience || apiProfil.anneesExperience || "",
      handicap: apiProfil.disability || apiProfil.handicap || false,
      autorisationTravail: apiProfil.workAuthorization || apiProfil.autorisationTravail || true,
      permis: identite.permis,
    };
  }

  // ─── Types de champs considérés comme des dates ────────────────────────────

  var DATE_FIELD_TYPES = [
    "date_debut", "date_fin", "date_diplome",
    "disponibilite", "date_naissance"
  ];

  // ─── Écoute des messages du popup ──────────────────────────────────────────

  chrome.runtime.onMessage.addListener(
    function (message, sender, sendResponse) {
      switch (message.type) {
        case "FILL_FORM":
          handleFillForm(message.options || {})
            .then(function (result) {
              sendResponse(result);
            })
            .catch(function (err) {
              Logger.error("FILL_FORM error", err);
              sendResponse({ success: false, error: err.message });
            });
          return true; // réponse asynchrone

        case "DETECT_FIELDS":
          try {
            var fields = detectAllFields();
            sendResponse({
              success: true,
              fields: fields,
              site: detectCurrentSite(),
            });
          } catch (err) {
            sendResponse({ success: false, fields: [], error: err.message });
          }
          return false;

        case "EXTRACT_OFFER":
          try {
            var offer = window.OfferExtractor ? OfferExtractor.extract() : {};
            sendResponse({ success: true, offer: offer });
          } catch (err) {
            sendResponse({ success: false, error: err.message });
          }
          return false;

        case "PING":
          sendResponse({ success: true, alive: true });
          return false;
      }
    },
  );

  // ─── Remplissage du formulaire ──────────────────────────────────────────────

  /**
   * Récupère le profil depuis le service worker, scanne la page et remplit les champs.
   *
   * @param {{ overwrite: boolean }} options
   * @returns {Promise<{ success: boolean, filled: number, total: number }>}
   */
  async function handleFillForm(options) {
    var overwrite = options.overwrite === true;
    var showToast = options.showToast !== false; // activé par défaut
    var hostname = window.location.hostname;
    var isSF = hostname.includes("successfactors");

    // 1. Récupérer le profil
    var profileResponse = await new Promise(function (resolve) {
      chrome.runtime.sendMessage({ type: "GET_CACHED_PROFILE" }, resolve);
    });

    if (!profileResponse || !profileResponse.profil) {
      return {
        success: false,
        filled: 0,
        total: 0,
        error:
          profileResponse && profileResponse.error
            ? profileResponse.error
            : "Profil non disponible. Connectez-vous dans le popup CVGen.",
      };
    }

    var rawProfil = profileResponse.profil;
    // Récupérer les infos utilisateur (prenom, nom, email) stockées au login
    var user = await Storage.getUser();
    var profil = normalizeProfileFromAPI(rawProfil, user);
    var coverLetter = (await Storage.getCoverLetter()) || "";
    var filled = 0;
    var skipped = 0;

    // ─── Diagnostic : compte utilisé (toujours visible dans la console page) ──
    // Permet à l'utilisateur de vérifier que c'est bien SON profil qui est injecté.
    var diagPrenom = (user && user.prenom) || (profil.identite && profil.identite.prenom) || "?";
    var diagNom    = (user && user.nom)    || (profil.identite && profil.identite.nom)    || "?";
    var diagEmail  = (user && user.email)  || (profil.identite && profil.identite.email)  || "?";
    console.log(
      "%c[CVGen] COMPTE UTILISÉ → " + diagPrenom + " " + diagNom + "  ‹" + diagEmail + "›",
      "background:#0b5; color:white; font-weight:bold; padding:4px 8px; border-radius:3px;"
    );

    // Dump complet et VISIBLE de toutes les expériences et formations
    // (utile pour debug : voir ce que le backend a vraiment renvoyé)
    console.log(
      "%c[CVGen] EXPÉRIENCES (" + (profil.experiences || []).length + ")",
      "background:#06b; color:white; font-weight:bold; padding:2px 6px;"
    );
    if (profil.experiences && profil.experiences.length > 0) {
      console.table(profil.experiences);
    } else {
      console.warn("[CVGen] ⚠ AUCUNE expérience dans le profil ! Vérifie ton profil sur cvgen.fr");
    }
    console.log(
      "%c[CVGen] FORMATIONS (" + (profil.formations || []).length + ")",
      "background:#06b; color:white; font-weight:bold; padding:2px 6px;"
    );
    if (profil.formations && profil.formations.length > 0) {
      console.table(profil.formations);
    } else {
      console.warn("[CVGen] ⚠ AUCUNE formation dans le profil !");
    }

    Logger.log(
      "Profil chargé — " +
        (profil.experiences ? profil.experiences.length : 0) + " exp, " +
        (profil.formations ? profil.formations.length : 0) + " formations"
    );
    Logger.debug("API brut — clés: " + Object.keys(rawProfil).join(", "));

    // 2. Ouvrir les accordéons (SuccessFactors, etc.) et attendre le chargement Ajax
    await expandProfileAccordions();
    await waitForInputs(1500);

    // 3. Scanner tous les champs : DOM classique + shadow DOM + iframes
    var allInputs = querySelectorAllDeepInputs(document);
    var iframeInputs = getIframeInputs();
    for (var ii = 0; ii < iframeInputs.length; ii++) allInputs.push(iframeInputs[ii]);

    var visibleInputs = allInputs.filter(function (el) {
      return !shouldIgnore(el);
    });

    // 3b. Pré-remplir les paires de selects mois/année via DateHandler
    if (window.DateHandler) {
      var splitPairs = DateHandler.detectSplitSelects(document);
      for (var sp = 0; sp < splitPairs.length; sp++) {
        var pair = splitPairs[sp];
        // Déterminer la date à partir du contexte du container
        var pairContainer = pair.container;
        var pairCtxText = normalize(
          (pairContainer && (pairContainer.innerText || pairContainer.textContent) || "").substring(0, 300)
        );
        var pairDateValue = null;
        if (/debut|start|from|commencement/.test(pairCtxText)) {
          pairDateValue = profil.experiences && profil.experiences[0] ? profil.experiences[0].dateDebut : null;
        } else if (/fin|end|to |jusqu/.test(pairCtxText)) {
          pairDateValue = profil.experiences && profil.experiences[0] ? profil.experiences[0].dateFin : null;
        } else if (/diplome|graduation|obtention|formation/.test(pairCtxText)) {
          pairDateValue = profil.formations && profil.formations[0] ? profil.formations[0].annee : null;
        } else if (/naissance|birth|dob/.test(pairCtxText)) {
          pairDateValue = profil.identite ? profil.identite.dateNaissance : null;
        }
        if (pairDateValue) {
          var pairOk = DateHandler.fillSplitSelects(pair.monthSelect, pair.yearSelect, pairDateValue);
          if (pairOk) {
            showFieldFeedback(pair.monthSelect);
            showFieldFeedback(pair.yearSelect);
            filled += 2;
          }
        }
      }
    }

    // Radios déjà remplis (pour éviter les doublons dans le même groupe)
    var filledRadioGroups = {};

    for (var i = 0; i < visibleInputs.length; i++) {
      var el = visibleInputs[i];

      // Ignorer checkbox/radio sans type détecté, ou déjà rempli
      if (el.type === "checkbox" || el.type === "radio") {
        var cbType = detectFieldType(el);
        if (!cbType) continue;

        // Skip si ce groupe radio a déjà été rempli
        if (el.type === "radio") {
          var groupKey = el.getAttribute("name") || "";
          if (filledRadioGroups[groupKey]) continue;
        }

        if (!overwrite && el.checked) { skipped++; continue; }

        var cbValue = getValueForField(cbType, profil, coverLetter);
        if (cbValue) {
          try {
            var cbOk = fillCheckboxOrRadio(el, cbValue);
            if (cbOk) {
              showFieldFeedback(el);
              filled++;
              if (el.type === "radio") filledRadioGroups[el.getAttribute("name") || ""] = true;
            }
          } catch (cbErr) {
            Logger.error("Erreur checkbox/radio", cbErr);
          }
        }
        continue;
      }

      if (!overwrite && isAlreadyFilled(el)) {
        skipped++;
        continue;
      }

      try {
        var detectedType = detectFieldType(el);

        // ── Champ date (tous types) ─────────────────────────────────────
        var isDateType = detectedType && DATE_FIELD_TYPES.indexOf(detectedType) !== -1;
        if (isDateField(el) || isDateType) {
          var dateValue = null;
          if (detectedType) {
            dateValue = getValueForField(detectedType, profil, coverLetter);
          }
          // Fallback : si pas de type détecté mais c'est un champ date, deviner
          if (!dateValue && isDateField(el)) {
            dateValue = profil.disponibilite || "";
          }
          if (dateValue) {
            var dateOk = false;
            if (window.DateHandler) {
              dateOk = await DateHandler.fill(el, dateValue);
            } else {
              dateOk = await fillDateField(el, dateValue);
            }
            if (dateOk) {
              showFieldFeedback(el);
              filled++;
            }
          }
          continue;
        }

        // ── Custom select SuccessFactors ─────────────────────────────────
        if (isSF && isSFCustomSelect(el)) {
          var sfType = detectedType || detectFieldType(el);
          var sfValue = null;
          if (sfType === "niveau_etudes") {
            sfValue = normalizeDiploma(
              (profil.formations &&
                profil.formations[0] &&
                profil.formations[0].niveauEtudes) ||
                (profil.formations &&
                  profil.formations[0] &&
                  profil.formations[0].diplome) ||
                "",
            );
          } else if (sfType === "employeur_actuel") {
            sfValue = isCurrentEmployer(
              profil.experiences && profil.experiences[0],
            );
          } else if (sfType === "pays") {
            sfValue = (profil.identite && profil.identite.pays) || "France";
          } else {
            sfValue = getValueForField(sfType, profil, coverLetter);
          }
          if (sfValue) {
            var sfOk = await fillSFCustomSelect(el, sfValue);
            if (sfOk) {
              showFieldFeedback(el);
              filled++;
            }
          }
          continue;
        }

        // ── Custom dropdown ARIA ─────────────────────────────────────────
        if (isCustomDropdown(el)) {
          var cdType = detectedType || detectFieldType(el);
          var cdValue = getValueForField(cdType, profil, coverLetter);
          if (cdValue) {
            var cdOk = await fillCustomDropdown(el, cdValue);
            if (cdOk) {
              showFieldFeedback(el);
              filled++;
            }
          }
          continue;
        }

        // ── Select natif ─────────────────────────────────────────────────
        if (el.tagName === "SELECT") {
          var selType = detectedType || detectFieldType(el);
          var selValue = getValueForField(selType, profil, coverLetter);
          if (selValue) {
            var selOk = fillSelectField(el, selValue);
            if (selOk) {
              showFieldFeedback(el);
              filled++;
            }
          }
          continue;
        }

        // ── SF Paginated Picklist (input autocomplete avec dropdown) ────
        if (isSF && el.tagName === "INPUT" && isSFPaginatedPicklist(el)) {
          var plType = detectedType || detectFieldType(el);
          var plValue = plType ? getValueForField(plType, profil, coverLetter) : null;
          if (plValue) {
            Logger.debug("SF Picklist détecté: " + plType + " → " + plValue);
            var plOk = await fillSFPaginatedPicklist(el, plValue);
            if (plOk) {
              showFieldFeedback(el);
              filled++;
            }
          }
          continue;
        }

        // ── Input / textarea classique ───────────────────────────────────
        if (!detectedType) continue;
        var stdValue = getValueForField(detectedType, profil, coverLetter);
        if (!stdValue) {
          if (detectedType === "lettre_motivation")
            Logger.warn("Lettre non disponible");
          continue;
        }

        if (el.tagName === "TEXTAREA") {
          fillTextareaField(el, stdValue);
        } else if (detectedType === "telephone") {
          fillPhoneField(el, stdValue);
        } else {
          fillInputField(el, stdValue);
        }
        showFieldFeedback(el);
        filled++;
        Logger.debug(
          "Rempli: " +
            detectedType +
            " = " +
            (detectedType === "email" ? "[email]" : stdValue.substring(0, 20)),
        );
      } catch (fillErr) {
        Logger.error("Erreur remplissage", fillErr);
      }
    }

    // 3d. SuccessFactors / ARIA : remplir les custom selects (boutons, combobox)
    //     Ces éléments ne sont PAS des input/select/textarea et ne sont pas
    //     trouvés par le scan principal.
    try {
      var customSelectSelectors = [
        'button[aria-haspopup="listbox"]',
        'button[aria-haspopup="true"]',
        '[role="combobox"]:not(input):not(select)',
        '.select2-selection',
        '[data-automation-id*="select"]',
        '[data-automation-id*="dropdown"]',
      ];
      var customSelects = [];
      for (var cs = 0; cs < customSelectSelectors.length; cs++) {
        var csFound = document.querySelectorAll(customSelectSelectors[cs]);
        for (var cf = 0; cf < csFound.length; cf++) {
          if (customSelects.indexOf(csFound[cf]) === -1) customSelects.push(csFound[cf]);
        }
      }

      for (var ci = 0; ci < customSelects.length; ci++) {
        var csEl = customSelects[ci];
        // Ignorer si déjà rempli (texte différent de "Aucune sélection" / vide)
        var csText = (csEl.innerText || csEl.textContent || "").trim().toLowerCase();
        if (!overwrite && csText !== "" && csText !== "aucune sélection" && csText !== "aucune selection" && csText !== "select" && csText !== "--") {
          continue;
        }

        var csType = detectFieldType(csEl);
        if (!csType) {
          // Tenter la détection via le parent (label souvent à l'extérieur)
          var csParent = csEl.parentElement;
          if (csParent) csType = detectFieldType(csParent);
        }
        if (!csType) continue;

        var csValue = getValueForField(csType, profil, coverLetter);
        if (!csValue) continue;

        Logger.debug("Custom select SF détecté: " + csType + " → " + csValue);
        var csOk = await fillSFCustomSelect(csEl, csValue);
        if (csOk) {
          showFieldFeedback(csEl);
          filled++;
          Logger.debug("Custom select SF rempli: " + csType);
          // Laisser le DOM se stabiliser avant le prochain select
          await new Promise(function(r) { setTimeout(r, 500); });
        } else {
          // Fermer tout dropdown ouvert avant le fallback
          document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
          await new Promise(function(r) { setTimeout(r, 300); });
          // Fallback : essayer fillCustomDropdown
          csOk = await fillCustomDropdown(csEl, csValue);
          if (csOk) {
            showFieldFeedback(csEl);
            filled++;
            await new Promise(function(r) { setTimeout(r, 500); });
          }
        }
      }
    } catch (csErr) {
      Logger.warn("Custom selects SF: " + csErr.message);
    }

    // 3e. SuccessFactors RCM : scanner TOUS les containers .RCMFormField
    //     et remplir les selects/dropdowns trouvés par label
    if (isSF) {
      try {
        var rcmFields = document.querySelectorAll(".RCMFormField, .rcmFormElement, [class*='rcmFormField']");
        Logger.debug("SF RCM: " + rcmFields.length + " containers trouvés");

        for (var ri = 0; ri < rcmFields.length; ri++) {
          var rcmContainer = rcmFields[ri];

          // Lire le label du container
          var rcmLabel = rcmContainer.querySelector("label, .rcmFormFieldLabel, legend");
          if (!rcmLabel) continue;
          var rcmLabelText = (rcmLabel.innerText || rcmLabel.textContent || "").trim();
          if (!rcmLabelText) continue;

          // Chercher un <select> natif dans ce container
          var rcmSelect = rcmContainer.querySelector("select");
          if (rcmSelect) {
            // Vérifier s'il a déjà une valeur réelle
            var rcmSelectedOpt = rcmSelect.options && rcmSelect.options[rcmSelect.selectedIndex];
            var rcmOptText = rcmSelectedOpt ? (rcmSelectedOpt.text || "").trim().toLowerCase() : "";
            var rcmOptVal = rcmSelectedOpt ? (rcmSelectedOpt.value || "").trim() : "";

            var isPlaceholder = (
              rcmOptVal === "" || rcmOptVal === "-1" || rcmOptVal === "0" ||
              rcmOptText.includes("aucune") || rcmOptText.includes("sélection") ||
              rcmOptText.includes("selection") || rcmOptText.includes("select") ||
              rcmOptText.includes("choisir") || rcmOptText === "" || rcmOptText === "--"
            );

            if (!overwrite && !isPlaceholder) continue;

            // Détecter le type à partir du texte du label
            var rcmNormLabel = normalize(rcmLabelText);
            var rcmType = null;

            // Correspondance directe par mots-clés fréquents sur SF
            if (/code.*(pays|country)|indicatif|phone.*country|country.*code/.test(rcmNormLabel)) {
              rcmType = "indicatif_telephone";
            } else if (/pays.*(postul|appli)|country.*(appli|job)/.test(rcmNormLabel)) {
              rcmType = "pays";
            } else if (/pays.*(resid|résid)|country.*(resid|home)/.test(rcmNormLabel)) {
              rcmType = "pays";
            } else if (/^pays$|^country$/.test(rcmNormLabel)) {
              rcmType = "pays";
            } else {
              // Fallback : essayer detectFieldType sur le label
              rcmType = detectFieldType(rcmLabel);
              if (!rcmType) rcmType = detectFieldType(rcmSelect);
            }

            if (!rcmType) continue;

            var rcmValue = getValueForField(rcmType, profil, coverLetter);
            if (!rcmValue) continue;

            Logger.debug("SF RCM select: '" + rcmLabelText + "' → type=" + rcmType + " val=" + rcmValue);
            var rcmOk = fillSelectField(rcmSelect, rcmValue);
            if (rcmOk) {
              showFieldFeedback(rcmSelect);
              filled++;
              Logger.debug("SF RCM select rempli: " + rcmType);
            } else {
              Logger.warn("SF RCM select ÉCHEC: " + rcmType + " pour '" + rcmLabelText + "'");
            }
            continue;
          }

          // Pas de select natif → chercher un input picklist paginé (autocomplete SF)
          var rcmPicklistInput = rcmContainer.querySelector(
            'input[class*="rcmpaginated"], input[class*="Paginated"], ' +
            'input[aria-owns], input[class*="picklist"], input[class*="Picklist"]'
          );
          if (!rcmPicklistInput) {
            // Chercher un input text dans un container picklist
            var plContainer = rcmContainer.querySelector(
              '[class*="paginatedPicklist"], [class*="Picklist"]'
            );
            if (plContainer) {
              rcmPicklistInput = plContainer.querySelector('input[type="text"]');
            }
          }
          if (rcmPicklistInput) {
            var rcmPlOptText = (rcmPicklistInput.value || rcmPicklistInput.getAttribute("placeholder") || "").trim().toLowerCase();
            var rcmPlIsEmpty = !rcmPicklistInput.value || rcmPicklistInput.value.trim() === "" ||
              rcmPlOptText.includes("aucune") || rcmPlOptText.includes("select");

            if (!overwrite && !rcmPlIsEmpty) {
              // Déjà rempli, continuer au prochain container
            } else {
              var rcmNormLabelPl = normalize(rcmLabelText);
              var rcmTypePl = null;
              if (/code.*(pays|country)|indicatif|phone.*country|country.*code/.test(rcmNormLabelPl)) {
                rcmTypePl = "indicatif_telephone";
              } else if (/pays.*(postul|appli)|country.*(appli|job)/.test(rcmNormLabelPl)) {
                rcmTypePl = "pays";
              } else if (/pays.*(resid|résid)|country.*(resid|home)/.test(rcmNormLabelPl)) {
                rcmTypePl = "pays";
              } else if (/pays|country/.test(rcmNormLabelPl)) {
                rcmTypePl = "pays";
              } else {
                rcmTypePl = detectFieldType(rcmLabel);
              }
              if (rcmTypePl) {
                var rcmValuePl = getValueForField(rcmTypePl, profil, coverLetter);
                if (rcmValuePl) {
                  Logger.debug("SF RCM picklist: '" + rcmLabelText + "' → " + rcmTypePl + " = " + rcmValuePl);
                  var rcmOkPl = await fillSFPaginatedPicklist(rcmPicklistInput, rcmValuePl);
                  if (rcmOkPl) {
                    showFieldFeedback(rcmPicklistInput);
                    filled++;
                    await new Promise(function (r) { setTimeout(r, 500); });
                  }
                }
              }
            }
            continue;
          }

          // Pas de picklist non plus → chercher un composant custom (bouton, div cliquable)
          var rcmCustom = rcmContainer.querySelector(
            'button[aria-haspopup], [role="combobox"], [role="listbox"], ' +
            '[class*="select"], [class*="dropdown"], [class*="combobox"]'
          );
          if (rcmCustom) {
            var rcmCText = (rcmCustom.innerText || rcmCustom.textContent || "").trim().toLowerCase();
            if (!overwrite && rcmCText !== "" && !rcmCText.includes("aucune") &&
                !rcmCText.includes("select") && rcmCText !== "--") continue;

            var rcmNormLabel2 = normalize(rcmLabelText);
            var rcmType2 = null;
            if (/code.*(pays|country)|indicatif|phone.*country|country.*code/.test(rcmNormLabel2)) {
              rcmType2 = "indicatif_telephone";
            } else if (/pays|country/.test(rcmNormLabel2)) {
              rcmType2 = "pays";
            } else {
              rcmType2 = detectFieldType(rcmLabel);
            }
            if (!rcmType2) continue;

            var rcmValue2 = getValueForField(rcmType2, profil, coverLetter);
            if (!rcmValue2) continue;

            Logger.debug("SF RCM custom: '" + rcmLabelText + "' → " + rcmType2 + " = " + rcmValue2);
            var rcmOk2 = await fillSFCustomSelect(rcmCustom, rcmValue2);
            if (rcmOk2) {
              showFieldFeedback(rcmCustom);
              filled++;
              await new Promise(function (r) { setTimeout(r, 500); });
            }
          }
        }
      } catch (rcmErr) {
        Logger.warn("SF RCM handler: " + rcmErr.message);
      }
    }

    // 4. Sections dynamiques (Expériences, Formations)
    var expFilled = 0,
      formFilled = 0;
    try {
      expFilled = await fillExperienceSections(profil);
      formFilled = await fillFormationSections(profil);
    } catch (dynErr) {
      Logger.warn("Sections dynamiques : " + dynErr.message);
    }

    // 5. Upload fichiers (CV / Lettre de motivation) si disponibles
    var filesFilled = 0;
    if (window.FileUploader) {
      try {
        var cvBase64 = await Storage.get("cvBase64");
        if (cvBase64) {
          var cvInput = FileUploader.findCVInput();
          if (cvInput) {
            var cvName = (profil.identite ? "CV_" + (profil.identite.prenom || "") + "_" + (profil.identite.nom || "") : "CV") + ".pdf";
            if (FileUploader.upload(cvInput, cvBase64, cvName)) {
              showFieldFeedback(cvInput);
              filesFilled++;
            }
          }
        }
        var lmBase64 = await Storage.get("lmBase64");
        if (lmBase64) {
          var lmInput = FileUploader.findCoverLetterInput();
          if (lmInput) {
            var lmName = "Lettre_Motivation.pdf";
            if (FileUploader.upload(lmInput, lmBase64, lmName)) {
              showFieldFeedback(lmInput);
              filesFilled++;
            }
          }
        }
      } catch (fileErr) {
        Logger.warn("Upload fichiers : " + fileErr.message);
      }
    }

    var totalFilled = filled + expFilled + formFilled + filesFilled;
    if (showToast) {
      showCompletionToast(totalFilled, visibleInputs.length);
    }
    Logger.log(
      "Terminé: " + filled + " standards + " +
        expFilled + " exp + " + formFilled + " form + " +
        filesFilled + " fichiers, " + skipped + " ignorés",
    );

    return {
      success: true,
      filled: totalFilled,
      total: visibleInputs.length,
      skipped: skipped,
    };
  }

  // ─── Ouverture des accordéons de profil (SuccessFactors, etc.) ────────────

  /**
   * Cherche et ouvre les accordéons "Informations sur le profil" qui
   * contiennent les champs de base (prénom, nom, email, etc.)
   */
  async function expandProfileAccordions() {
    var profileSectionKeywords = [
      "informations sur le profil",
      "informations personnelles",
      "coordonnées",
      "données personnelles",
      "mes informations",
      "personal information",
      "contact information",
      "basic information",
      "my information",
      "applicant information",
      "informations du candidat",
      "your information",
    ];

    var candidates = Array.from(
      document.querySelectorAll(
        'button, [role="button"], summary, a, h2, h3, h4, ' +
          '[class*="accordion"], [class*="section-header"], [class*="panel-title"], ' +
          '[class*="collapsible"], [class*="expandable"], details > summary',
      ),
    );

    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      var text = normalize(el.innerText || el.textContent || "");
      for (var j = 0; j < profileSectionKeywords.length; j++) {
        if (text.includes(normalize(profileSectionKeywords[j]))) {
          var isCollapsed =
            el.getAttribute("aria-expanded") === "false" ||
            el.classList.contains("collapsed") ||
            el.closest('[aria-expanded="false"]') !== null;

          // Aussi ouvrir les <details> fermés
          var detailsParent = el.closest("details");
          if (detailsParent && !detailsParent.open) {
            detailsParent.open = true;
            isCollapsed = false; // déjà ouvert
          }

          if (isCollapsed) {
            el.click();
            await new Promise(function (r) {
              setTimeout(r, 1500);
            });
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
      var existing = document.querySelectorAll(
        'input:not([type="hidden"]), textarea, select',
      );
      if (existing.length > 2) {
        setTimeout(resolve, 300);
        return;
      }

      var deadline = Date.now() + timeoutMs;
      var observer = new MutationObserver(function () {
        var inputs = document.querySelectorAll(
          'input:not([type="hidden"]), textarea, select',
        );
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
   * Inclut shadow DOM et iframes accessibles.
   *
   * @returns {Array<{ type: string, label: string, tag: string }>}
   */
  function detectAllFields() {
    var allInputs = querySelectorAllDeepInputs(document);
    var iframeInputs = getIframeInputs();
    for (var ii = 0; ii < iframeInputs.length; ii++) allInputs.push(iframeInputs[ii]);

    var results = [];

    allInputs
      .filter(function (el) {
        return !shouldIgnore(el);
      })
      .forEach(function (el) {
        var type = detectFieldType(el);
        if (!type) return;

        var label =
          el.getAttribute("placeholder") ||
          el.getAttribute("aria-label") ||
          el.getAttribute("name") ||
          el.getAttribute("id") ||
          "";

        results.push({
          type: type,
          label: label,
          tag: el.tagName.toLowerCase(),
        });
      });

    return results;
  }
})();
