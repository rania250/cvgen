/**
 * CVGen Logger
 * Ne journalise jamais le JWT ni les tokens en clair.
 */

var Logger = (function () {
  'use strict';

  var JWT_PATTERN = /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/;
  var SENSITIVE_KEYS = ['token', 'jwt', 'authorization', 'accesstoken', 'refreshtoken', 'password'];

  function sanitize(value, depth) {
    depth = depth || 0;
    if (depth > 5) return value;

    if (typeof value === 'string' && JWT_PATTERN.test(value)) {
      return '[TOKEN REDACTED]';
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      var sanitized = {};
      for (var key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          if (SENSITIVE_KEYS.indexOf(key.toLowerCase()) !== -1) {
            sanitized[key] = '[REDACTED]';
          } else {
            sanitized[key] = sanitize(value[key], depth + 1);
          }
        }
      }
      return sanitized;
    }

    if (Array.isArray(value)) {
      return value.map(function (item) { return sanitize(item, depth + 1); });
    }

    return value;
  }

  return {
    log: function (message, data) {
      if (data !== undefined) {
        console.log('[CVGen]', message, sanitize(data));
      } else {
        console.log('[CVGen]', message);
      }
    },

    error: function (message, err) {
      var detail = err instanceof Error ? err.message : (err || '');
      console.error('[CVGen] ❌', message, detail);
    },

    warn: function (message, data) {
      if (data !== undefined) {
        console.warn('[CVGen] ⚠️', message, sanitize(data));
      } else {
        console.warn('[CVGen] ⚠️', message);
      }
    },

    debug: function (message, data) {
      if (data !== undefined) {
        console.debug('[CVGen] 🔍', message, sanitize(data));
      } else {
        console.debug('[CVGen] 🔍', message);
      }
    }
  };
})();
