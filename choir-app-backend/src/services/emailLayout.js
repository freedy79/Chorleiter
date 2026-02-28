const db = require('../models');
const { replacePlaceholders } = require('./emailTemplateManager');

const DEFAULT_FOOTER_BODY =
  '<p>Du erhältst diese Mail, weil du im Chor <strong>{{choir}}</strong> angemeldet bist. ' +
  'Wenn du kein Interesse mehr am Chor hast und dich austragen möchtest, kannst du das ' +
  '<a href="{{leave_link}}">hier</a> tun.</p>';

/**
 * Fetches the footer template from the database or falls back to the hardcoded default.
 */
async function getFooterTemplate() {
  try {
    const row = await db.mail_template.findOne({ where: { type: 'mail-footer' } });
    return row?.body || DEFAULT_FOOTER_BODY;
  } catch {
    return DEFAULT_FOOTER_BODY;
  }
}

/**
 * Builds the footer HTML by replacing placeholders in the footer template.
 *
 * @param {Object} replacements  – at minimum { choir, leave_link }
 * @returns {Promise<string>}    rendered footer HTML snippet
 */
async function buildFooterHtml(replacements = {}) {
  const template = await getFooterTemplate();
  return replacePlaceholders(template, null, replacements);
}

/**
 * Wraps the email body HTML and a footer snippet into a polished, responsive
 * HTML email layout that renders well across clients.
 *
 * @param {string} bodyHtml      the main content HTML
 * @param {string} footerHtml    the rendered footer snippet (may be empty)
 * @returns {string}             full HTML document
 */
function wrapInLayout(bodyHtml, footerHtml = '') {
  const footerSection = footerHtml
    ? `<!-- footer -->
            <tr>
              <td style="padding:0;">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="border-top:1px solid #e0e0e0; padding:24px 32px; font-size:12px; line-height:1.5; color:#888888;">
                      ${footerHtml}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>NAK Chorleiter</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    /* Reset */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }

    /* Layout */
    .email-wrapper { width: 100%; background-color: #f4f4f7; padding: 24px 0; }
    .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }

    /* Typography */
    .email-body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #333333; }
    .email-body p { margin: 0 0 12px 0; }
    .email-body a { color: #1a73e8; text-decoration: none; }
    .email-body a:hover { text-decoration: underline; }
    .email-body ul, .email-body ol { padding-left: 20px; margin: 0 0 12px 0; }
    .email-body h1, .email-body h2, .email-body h3 { margin: 0 0 12px 0; color: #222222; }
    .email-body img { max-width: 100%; height: auto; }

    /* Responsive */
    @media only screen and (max-width: 620px) {
      .email-wrapper { padding: 12px 8px !important; }
      .email-container { border-radius: 0 !important; }
      .email-content-cell { padding: 20px 16px !important; }
      .email-footer-cell { padding: 16px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f7;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f4f4f7; padding:24px 0;">
    <tr>
      <td align="center">
        <table class="email-container" width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px; background-color:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- header accent bar -->
          <tr>
            <td style="background: linear-gradient(135deg, #1a73e8, #4285f4); height:4px; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          <!-- body -->
          <tr>
            <td class="email-content-cell email-body" style="padding:32px 32px 24px 32px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#333333;">
              ${bodyHtml}
            </td>
          </tr>
          ${footerSection}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Convenience: wraps body HTML in the full layout including a DB-driven footer.
 *
 * @param {string} bodyHtml
 * @param {Object} opts          – { choir, frontendUrl } (optional)
 * @returns {Promise<string>}    complete HTML email
 */
async function wrapWithMailLayout(bodyHtml, opts = {}) {
  const { choir, frontendUrl } = opts;
  let footerHtml = '';
  if (choir) {
    const leaveLink = frontendUrl ? `${frontendUrl}/profile` : 'https://nak-chorleiter.de/profile';
    footerHtml = await buildFooterHtml({
      choir,
      leave_link: leaveLink
    });
  }
  return wrapInLayout(bodyHtml, footerHtml);
}

/**
 * Appends footer text (plain-text version) to an existing plain-text email body.
 */
function appendFooterText(text, choir) {
  if (!choir) return text;
  return `${text}\n\n---\nDu erhältst diese Mail, weil du im Chor ${choir} angemeldet bist.`;
}

module.exports = { wrapInLayout, wrapWithMailLayout, buildFooterHtml, appendFooterText, DEFAULT_FOOTER_BODY };
