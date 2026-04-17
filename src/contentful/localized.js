const LOCALE_KEY_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

function isLocaleMap(value) {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.nodeType === "document" || value.sys) return false;
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((k) => LOCALE_KEY_RE.test(k));
}

/**
 * Contentful can return a single locale as a plain value or as a locale map
 * (when fetched with locale=*). Unwraps to the requested locale, falling back
 * to the first locale in the map when the locale is absent.
 */
export function unwrapLocalized(value, locale = null) {
  if (!isLocaleMap(value)) return value;
  const keys = Object.keys(value);
  if (locale && value[locale] !== undefined) return value[locale];
  return value[keys[0]];
}

/** Returns true when a field value is a locale map (fetched with locale=*). */
export { isLocaleMap };
