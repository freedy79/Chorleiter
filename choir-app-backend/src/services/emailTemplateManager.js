function replacePlaceholders(text, type, replacements) {
  let result = text;
  for (const [key, value] of Object.entries(replacements)) {
    const anchor = key.toLowerCase().includes('link')
      ? `<a href="${value}">${value}</a>`
      : value;
    result = result.split(`{{${key}}}`).join(value);
    result = result.split(`{{${key}-html}}`).join(anchor);
    if (type) {
      result = result.split(`{{${type}-${key}}}`).join(value);
      result = result.split(`{{${type}-${key}-html}}`).join(anchor);
    }
  }
  return result;
}

function buildTemplate(template, type, replacements) {
  const subjectTemplate = template?.subject || '';
  const bodyTemplate = template?.body || '';
  const subject = replacePlaceholders(subjectTemplate, type, replacements);
  const html = replacePlaceholders(bodyTemplate, type, replacements);
  const text = html.replace(/<[^>]+>/g, ' ');
  return { subject, html, text };
}

module.exports = { replacePlaceholders, buildTemplate };
