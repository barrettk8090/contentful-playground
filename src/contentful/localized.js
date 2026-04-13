/**
 * Contentful can return a single locale as a plain value or as a locale map.
 * Unwraps the first locale when the value looks like a locale dictionary.
 */
export function unwrapLocalized(value) {
  if (value == null) return value;
  if (typeof value !== "object" || Array.isArray(value)) return value;
  if (value.nodeType === "document" || value.sys) return value;
  const keys = Object.keys(value);
  if (keys.length === 0) return value;
  if (keys.every((k) => /^[a-z]{2}(-[A-Z]{2})?$/.test(k))) {
    return value[keys[0]];
  }
  return value;
}
