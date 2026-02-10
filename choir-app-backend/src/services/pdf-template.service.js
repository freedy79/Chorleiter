const db = require('../models');
const { getDefaultPdfTemplate } = require('./pdf-template.defaults');

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function deepMerge(base, override) {
  if (!isObject(base)) return override ?? base;
  const result = { ...base };
  if (!isObject(override)) return result;
  for (const [key, value] of Object.entries(override)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

async function getPdfTemplateConfig(type) {
  const defaults = getDefaultPdfTemplate(type);
  if (!defaults) return null;

  const entry = await db.pdf_template.findOne({ where: { type } });
  if (!entry) return defaults;

  let parsed;
  try {
    parsed = entry.config ? JSON.parse(entry.config) : null;
  } catch (err) {
    parsed = null;
  }

  return deepMerge(defaults, parsed || {});
}

module.exports = { getPdfTemplateConfig };
