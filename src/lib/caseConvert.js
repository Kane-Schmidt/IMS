// Postgres columns are snake_case; the app's objects are camelCase. These
// converters are shallow on purpose — jsonb columns (e.g. depreciation_model,
// storage_locations) already store their contents in camelCase, matching
// what the app expects with no further conversion needed.

function toSnakeKey(key) {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function toCamelKey(key) {
  return key.replace(/_([a-z0-9])/g, (_match, char) => char.toUpperCase())
}

export function toSnakeCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [toSnakeKey(key), value]))
}

export function toCamelCase(obj) {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj
  return Object.fromEntries(Object.entries(obj).map(([key, value]) => [toCamelKey(key), value]))
}
