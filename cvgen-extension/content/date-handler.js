/**
 * CVGen Date Handler
 * Gestion avancée de tous les types de champs date rencontrés
 * sur les sites de recrutement.
 *
 * Formats supportés :
 *   - <input type="date"> → YYYY-MM-DD
 *   - <input type="month"> → YYYY-MM
 *   - <input type="text"> placeholder JJ/MM/AAAA → DD/MM/YYYY
 *   - <input type="text"> placeholder MM/AAAA ou MM/YYYY → MM/YYYY
 *   - <input type="text"> placeholder YYYY → année seule
 *   - Datepickers custom (flatpickr, pikaday, react-datepicker, etc.)
 *   - Deux selects séparés mois/année
 *
 * isoDateString toujours ISO : "2020-06" ou "2020-06-15" ou "2020"
 * Exposé via : window.DateHandler = { fill, fillSplitSelects, detectSplitSelects }
 */

var DateHandler = (function () {
  'use strict';

  var DATEPICKER_CLASSES = [
    'datepicker', 'date-picker', 'react-datepicker',
    'flatpickr', 'pikaday', 'daterangepicker',
    'ui-datepicker', 'vdp-datepicker', 'ant-picker',
    'el-date-editor', 'mat-datepicker', 'mdc-text-field',
    'dp__input', 'litepicker'
  ];

  // ─── Parsing ISO vers composants ──────────────────────────────────────────

  function parseISO(isoStr) {
    if (!isoStr) return null;
    var str = String(isoStr).trim();

    // YYYY-MM-DD
    var full = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (full) return { year: full[1], month: full[2], day: full[3] };

    // YYYY-MM
    var ym = str.match(/^(\d{4})-(\d{2})$/);
    if (ym) return { year: ym[1], month: ym[2], day: '01' };

    // YYYY
    var y = str.match(/^(\d{4})$/);
    if (y) return { year: y[1], month: '01', day: '01' };

    // DD/MM/YYYY (format français)
    var fr = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (fr) return { year: fr[3], month: fr[2], day: fr[1] };

    // MM/YYYY
    var my = str.match(/^(\d{2})\/(\d{4})$/);
    if (my) return { year: my[2], month: my[1], day: '01' };

    return null;
  }

  // ─── Formatage selon le type de champ ─────────────────────────────────────

  function toYYYYMMDD(parsed) {
    return parsed.year + '-' + parsed.month + '-' + parsed.day;
  }

  function toYYYYMM(parsed) {
    return parsed.year + '-' + parsed.month;
  }

  function toDDMMYYYY(parsed) {
    return parsed.day + '/' + parsed.month + '/' + parsed.year;
  }

  function toMMYYYY(parsed) {
    return parsed.month + '/' + parsed.year;
  }

  // ─── Simulation de saisie caractère par caractère ─────────────────────────

  function delayMs(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function typeCharByChar(element, text) {
    element.focus();
    element.value = '';
    element.dispatchEvent(new Event('focus', { bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));

    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      element.value += ch;
      element.dispatchEvent(new KeyboardEvent('keydown',  { key: ch, code: 'Key' + ch.toUpperCase(), bubbles: true, cancelable: true }));
      element.dispatchEvent(new KeyboardEvent('keypress', { key: ch, bubbles: true, cancelable: true }));
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup',    { key: ch, bubbles: true, cancelable: true }));
      await delayMs(15);
    }

    // Fermer un éventuel calendrier
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', code: 'Tab', bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    await delayMs(80);

    // Fermer les popups calendrier
    var pickers = document.querySelectorAll(
      '.datepicker, [class*="calendar"], [class*="datepicker"], .flatpickr-calendar, .pikaday, .react-datepicker__popper'
    );
    if (pickers.length > 0) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    }

    return true;
  }

  // ─── Set via le setter natif (React/Vue/Angular compat) ───────────────────

  function setNativeValue(element, value) {
    try {
      var proto = element.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) {
        descriptor.set.call(element, value);
      } else {
        element.value = value;
      }
    } catch (_) {
      element.value = value;
    }
    element.dispatchEvent(new Event('input',  { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ─── Détection du format attendu par le champ ────────────────────────────

  function detectExpectedFormat(element) {
    if (element.type === 'date')  return 'YYYY-MM-DD';
    if (element.type === 'month') return 'YYYY-MM';

    var ph = (element.getAttribute('placeholder') || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (/jj\s*\/\s*mm\s*\/\s*aaaa|dd\s*\/\s*mm\s*\/\s*yyyy/i.test(ph)) return 'DD/MM/YYYY';
    if (/mm\s*\/\s*aaaa|mm\s*\/\s*yyyy/i.test(ph))                      return 'MM/YYYY';
    if (/^(aaaa|yyyy|annee|year)$/i.test(ph.trim()))                     return 'YYYY';
    if (/mm\s*-\s*yyyy|yyyy\s*-\s*mm/i.test(ph))                        return 'YYYY-MM';

    // Vérifier le data-date-format
    var fmt = element.getAttribute('data-date-format') || element.getAttribute('dateformat') || '';
    fmt = fmt.toLowerCase();
    if (fmt.includes('dd') && fmt.includes('mm') && fmt.includes('yyyy')) return 'DD/MM/YYYY';
    if (fmt.includes('mm') && fmt.includes('yyyy') && !fmt.includes('dd')) return 'MM/YYYY';
    if (fmt === 'yyyy') return 'YYYY';

    // Vérifier si datepicker custom
    var cls = (element.className || '').toLowerCase();
    var parentCls = (element.parentElement && element.parentElement.className || '').toLowerCase();
    var combinedCls = cls + ' ' + parentCls;

    for (var i = 0; i < DATEPICKER_CLASSES.length; i++) {
      if (combinedCls.includes(DATEPICKER_CLASSES[i])) return 'DATEPICKER';
    }

    if (element.getAttribute('data-datepicker') || element.getAttribute('data-date')) {
      return 'DATEPICKER';
    }

    // Si le champ a un inputmode numérique et un maxlength de 10 → probablement DD/MM/YYYY
    if (element.getAttribute('inputmode') === 'numeric' && element.maxLength === 10) {
      return 'DD/MM/YYYY';
    }

    // Fallback : si c'est un text input avec un pattern date-like
    if (element.getAttribute('pattern') && /\d.*\d/.test(element.getAttribute('pattern'))) {
      return 'DD/MM/YYYY';
    }

    return 'DD/MM/YYYY'; // fallback par défaut
  }

  // ─── Selects séparés mois/année ───────────────────────────────────────────

  var MONTH_NAMES_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var MONTH_NAMES_EN = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  var MONTH_ABBR_FR  = ['janv','févr','mars','avr','mai','juin','juil','août','sept','oct','nov','déc'];
  var MONTH_ABBR_EN  = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  function isMonthSelect(selectEl) {
    var options = Array.from(selectEl.options);
    if (options.length < 6 || options.length > 14) return false; // 12 months + blank/placeholder

    var name = (selectEl.getAttribute('name') || '').toLowerCase();
    var id = (selectEl.getAttribute('id') || '').toLowerCase();
    var label = (selectEl.getAttribute('aria-label') || '').toLowerCase();
    var combined = name + ' ' + id + ' ' + label;

    if (/month|mois/i.test(combined)) return true;

    // Vérifier si les options contiennent des noms de mois
    var optTexts = options.map(function (o) { return (o.text || '').toLowerCase().trim(); });
    var monthMatches = 0;
    var allMonths = MONTH_NAMES_FR.concat(MONTH_NAMES_EN, MONTH_ABBR_FR, MONTH_ABBR_EN);
    for (var i = 0; i < optTexts.length; i++) {
      for (var j = 0; j < allMonths.length; j++) {
        if (optTexts[i].includes(allMonths[j])) { monthMatches++; break; }
      }
    }
    return monthMatches >= 6;
  }

  function isYearSelect(selectEl) {
    var options = Array.from(selectEl.options);
    if (options.length < 3) return false;

    var name = (selectEl.getAttribute('name') || '').toLowerCase();
    var id = (selectEl.getAttribute('id') || '').toLowerCase();
    var label = (selectEl.getAttribute('aria-label') || '').toLowerCase();
    var combined = name + ' ' + id + ' ' + label;

    if (/year|annee|année/i.test(combined)) return true;

    // Vérifier si les options sont des années (4 chiffres)
    var yearCount = 0;
    for (var i = 0; i < options.length; i++) {
      if (/^\d{4}$/.test(options[i].value.trim()) || /^\d{4}$/.test(options[i].text.trim())) {
        yearCount++;
      }
    }
    return yearCount >= 3;
  }

  /**
   * Cherche des paires de selects mois/année proches dans le DOM.
   * Retourne un tableau de { monthSelect, yearSelect, container }.
   */
  function detectSplitSelects(rootEl) {
    rootEl = rootEl || document;
    var allSelects = Array.from(rootEl.querySelectorAll('select'));
    var pairs = [];
    var used = new Set();

    for (var i = 0; i < allSelects.length; i++) {
      if (used.has(i)) continue;
      var sel = allSelects[i];

      if (isMonthSelect(sel)) {
        // Chercher le yearSelect le plus proche
        var container = sel.closest('fieldset, .form-group, .field-group, .form-row, .date-group, [class*="date"], div') || sel.parentElement;
        var siblingSelects = container ? Array.from(container.querySelectorAll('select')) : [];

        for (var j = 0; j < siblingSelects.length; j++) {
          if (siblingSelects[j] === sel) continue;
          if (isYearSelect(siblingSelects[j])) {
            var idx = allSelects.indexOf(siblingSelects[j]);
            used.add(i);
            used.add(idx);
            pairs.push({ monthSelect: sel, yearSelect: siblingSelects[j], container: container });
            break;
          }
        }
      } else if (isYearSelect(sel)) {
        var container2 = sel.closest('fieldset, .form-group, .field-group, .form-row, .date-group, [class*="date"], div') || sel.parentElement;
        var siblingSelects2 = container2 ? Array.from(container2.querySelectorAll('select')) : [];

        for (var k = 0; k < siblingSelects2.length; k++) {
          if (siblingSelects2[k] === sel) continue;
          if (isMonthSelect(siblingSelects2[k])) {
            var idx2 = allSelects.indexOf(siblingSelects2[k]);
            used.add(i);
            used.add(idx2);
            pairs.push({ monthSelect: siblingSelects2[k], yearSelect: sel, container: container2 });
            break;
          }
        }
      }
    }
    return pairs;
  }

  /**
   * Remplit une paire de selects mois/année.
   */
  function fillSplitSelects(monthSelect, yearSelect, isoDateString) {
    var parsed = parseISO(isoDateString);
    if (!parsed) return false;

    var monthFilled = fillMonthSelect(monthSelect, parsed.month);
    var yearFilled  = fillYearSelect(yearSelect, parsed.year);

    return monthFilled || yearFilled;
  }

  function fillMonthSelect(selectEl, monthNum) {
    var monthIdx = parseInt(monthNum, 10);
    if (isNaN(monthIdx) || monthIdx < 1 || monthIdx > 12) return false;

    var options = Array.from(selectEl.options);

    // Essayer par valeur numérique
    for (var i = 0; i < options.length; i++) {
      var val = options[i].value.trim();
      if (val === monthNum || val === String(monthIdx) || val === String(monthIdx - 1)) {
        selectAndDispatch(selectEl, options[i].value);
        return true;
      }
    }

    // Essayer par nom de mois
    var monthTargets = [
      MONTH_NAMES_FR[monthIdx - 1], MONTH_NAMES_EN[monthIdx - 1],
      MONTH_ABBR_FR[monthIdx - 1], MONTH_ABBR_EN[monthIdx - 1]
    ];

    for (var j = 0; j < options.length; j++) {
      var text = (options[j].text || '').toLowerCase().trim();
      for (var k = 0; k < monthTargets.length; k++) {
        if (text.includes(monthTargets[k])) {
          selectAndDispatch(selectEl, options[j].value);
          return true;
        }
      }
    }
    return false;
  }

  function fillYearSelect(selectEl, yearStr) {
    var options = Array.from(selectEl.options);
    for (var i = 0; i < options.length; i++) {
      if (options[i].value.trim() === yearStr || options[i].text.trim() === yearStr) {
        selectAndDispatch(selectEl, options[i].value);
        return true;
      }
    }
    return false;
  }

  function selectAndDispatch(selectEl, value) {
    selectEl.focus();
    selectEl.value = value;
    selectEl.dispatchEvent(new Event('focus',     { bubbles: true }));
    selectEl.dispatchEvent(new Event('mousedown', { bubbles: true }));
    selectEl.dispatchEvent(new Event('input',     { bubbles: true }));
    selectEl.dispatchEvent(new Event('change',    { bubbles: true }));
    selectEl.dispatchEvent(new Event('blur',      { bubbles: true }));
  }

  // ─── Remplissage principal ────────────────────────────────────────────────

  /**
   * Remplit un champ date en détectant automatiquement le format attendu.
   *
   * @param {HTMLElement} element - L'input de date
   * @param {string} isoDateString - Date ISO : "2020-06-15", "2020-06", ou "2020"
   * @returns {Promise<boolean>}
   */
  async function fill(element, isoDateString) {
    var parsed = parseISO(isoDateString);
    if (!parsed) return false;

    var format = detectExpectedFormat(element);

    switch (format) {
      case 'YYYY-MM-DD':
        element.focus();
        setNativeValue(element, toYYYYMMDD(parsed));
        element.blur();
        return true;

      case 'YYYY-MM':
        element.focus();
        setNativeValue(element, toYYYYMM(parsed));
        element.blur();
        return true;

      case 'DD/MM/YYYY':
        return await typeCharByChar(element, toDDMMYYYY(parsed));

      case 'MM/YYYY':
        return await typeCharByChar(element, toMMYYYY(parsed));

      case 'YYYY':
        element.focus();
        setNativeValue(element, parsed.year);
        element.blur();
        return true;

      case 'DATEPICKER':
        // Pour les datepickers custom : taper la date au format attendu
        // On essaie d'abord YYYY-MM-DD (format universel), puis DD/MM/YYYY
        element.focus();
        await delayMs(100);
        // Vider le champ
        setNativeValue(element, '');
        await delayMs(50);
        // Taper caractère par caractère
        return await typeCharByChar(element, toDDMMYYYY(parsed));

      default:
        return await typeCharByChar(element, toDDMMYYYY(parsed));
    }
  }

  return {
    fill: fill,
    fillSplitSelects: fillSplitSelects,
    detectSplitSelects: detectSplitSelects
  };
})();

window.DateHandler = DateHandler;
