/**
 * CVGen Offer Extractor
 * Extrait le titre, le nom de l'entreprise et le texte de l'offre d'emploi
 * depuis la page courante d'un site de recrutement.
 *
 * Traverse le shadow DOM récursivement.
 * Exposé via : window.OfferExtractor = { extract }
 */

var OfferExtractor = (function () {
  'use strict';

  var MAX_TEXT_LENGTH = 3000;

  // ─── Mots-clés pour détecter les zones pertinentes ─────────────────────────

  var OFFER_SELECTORS = [
    '[class*="jobDescription"]', '[class*="job-description"]',
    '[class*="job_description"]', '[class*="description"]',
    '[id*="jobDescription"]', '[id*="job-description"]',
    '[id*="job_description"]', '[id*="description"]',
    '[class*="offer"]', '[class*="poste"]',
    '[data-testid*="description"]', '[data-testid*="job"]',
    '[class*="posting-description"]', '[class*="job-details"]',
    '[class*="vacancy"]', '[class*="annonce"]',
    'article', '.job-description', '#job-description',
    '.jobsearch-jobDescriptionText', // Indeed
    '.description__text', // LinkedIn
    '.jobs-description', // LinkedIn
    '[class*="JobDescription"]' // WTTJ, Greenhouse
  ];

  var COMPANY_SELECTORS = [
    '[class*="company"]', '[class*="employer"]', '[class*="entreprise"]',
    '[class*="Company"]', '[class*="Employer"]',
    '[id*="company"]', '[id*="employer"]', '[id*="entreprise"]',
    '[data-testid*="company"]', '[data-testid*="employer"]',
    '[class*="hiring-company"]', '[class*="org-name"]',
    '.jobsearch-InlineCompanyRating', // Indeed
    '.jobs-unified-top-card__company-name', // LinkedIn
    '.topcard__org-name-link' // LinkedIn
  ];

  var TITLE_SELECTORS = [
    'h1', '[class*="job-title"]', '[class*="jobTitle"]',
    '[class*="titre"]', '[class*="poste"]',
    '[data-testid*="title"]', '[data-testid*="jobTitle"]',
    '.jobsearch-JobInfoHeader-title', // Indeed
    '.jobs-unified-top-card__job-title', // LinkedIn
    '.topcard__title' // LinkedIn
  ];

  // ─── Traversée du Shadow DOM ───────────────────────────────────────────────

  /**
   * Collecte tous les éléments correspondant à un sélecteur,
   * y compris à travers les shadow roots.
   */
  function querySelectorAllDeep(root, selector) {
    var results = [];
    try {
      var found = root.querySelectorAll(selector);
      for (var i = 0; i < found.length; i++) results.push(found[i]);
    } catch (_) {}

    // Parcourir les enfants pour trouver les shadow hosts
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

  function querySelectorDeep(root, selector) {
    var results = querySelectorAllDeep(root, selector);
    return results.length > 0 ? results[0] : null;
  }

  // ─── Extraction ─────────────────────────────────────────────────────────────

  function extractTitle() {
    for (var i = 0; i < TITLE_SELECTORS.length; i++) {
      var el = querySelectorDeep(document, TITLE_SELECTORS[i]);
      if (el) {
        var text = (el.innerText || el.textContent || '').trim();
        if (text.length > 2 && text.length < 200) return text;
      }
    }
    // Fallback : <title> de la page
    var pageTitle = document.title || '';
    // Nettoyer les suffixes courants ("| Indeed", "- LinkedIn", etc.)
    return pageTitle
      .replace(/\s*[\|\-–—]\s*(Indeed|LinkedIn|WTTJ|Welcome|Lever|Greenhouse|France Travail|Workday).*/i, '')
      .trim();
  }

  function extractCompany() {
    for (var i = 0; i < COMPANY_SELECTORS.length; i++) {
      var elements = querySelectorAllDeep(document, COMPANY_SELECTORS[i]);
      for (var j = 0; j < elements.length; j++) {
        var text = (elements[j].innerText || elements[j].textContent || '').trim();
        if (text.length > 1 && text.length < 150) return text;
      }
    }
    return '';
  }

  function extractOfferText() {
    var texts = [];
    var seen = new Set();

    for (var i = 0; i < OFFER_SELECTORS.length; i++) {
      var elements = querySelectorAllDeep(document, OFFER_SELECTORS[i]);
      for (var j = 0; j < elements.length; j++) {
        var text = (elements[j].innerText || elements[j].textContent || '').trim();
        if (text.length > 50 && !seen.has(text)) {
          seen.add(text);
          texts.push(text);
        }
      }
    }

    // Si rien trouvé, prendre les h1/h2 et leurs sections parentes
    if (texts.length === 0) {
      var headings = querySelectorAllDeep(document, 'h1, h2');
      var offerKeywords = ['job', 'offer', 'poste', 'description', 'mission', 'profil', 'responsabilit'];
      for (var h = 0; h < headings.length; h++) {
        var heading = headings[h];
        var headingText = (heading.innerText || '').toLowerCase();
        for (var k = 0; k < offerKeywords.length; k++) {
          if (headingText.includes(offerKeywords[k])) {
            var parent = heading.parentElement;
            if (parent) {
              var pText = (parent.innerText || '').trim();
              if (pText.length > 50 && !seen.has(pText)) {
                seen.add(pText);
                texts.push(pText);
              }
            }
            break;
          }
        }
      }
    }

    var combined = texts.join('\n\n');

    // Dernier recours : si on n'a quasiment rien trouvé (ex. page de
    // formulaire de candidature sans bloc "description"), on prend le texte
    // visible principal de la page, nettoyé des lignes trop courtes/répétées.
    if (combined.trim().length < 120) {
      var bodyText = (document.body && document.body.innerText || '').trim();
      var lines = bodyText.split('\n');
      var kept = [];
      var seenLine = {};
      for (var l = 0; l < lines.length; l++) {
        var line = lines[l].trim();
        if (line.length < 3) continue;          // ignore lignes vides/parasites
        if (seenLine[line]) continue;            // dédoublonne
        seenLine[line] = true;
        kept.push(line);
      }
      var fallback = kept.join('\n');
      if (fallback.length > combined.length) {
        combined = fallback;
      }
    }

    if (combined.length > MAX_TEXT_LENGTH) {
      combined = combined.substring(0, MAX_TEXT_LENGTH);
    }
    return combined;
  }

  // ─── API publique ──────────────────────────────────────────────────────────

  function extract() {
    return {
      title: extractTitle(),
      company: extractCompany(),
      offerText: extractOfferText()
    };
  }

  return { extract: extract };
})();

window.OfferExtractor = OfferExtractor;
