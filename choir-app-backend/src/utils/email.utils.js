const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
    return EMAIL_PATTERN.test(normalizeEmail(email));
}

function normalizeEmailList(emails) {
    if (!Array.isArray(emails)) {
        return [];
    }
    return Array.from(new Set(
        emails
            .map(normalizeEmail)
            .filter(Boolean)
    ));
}

module.exports = {
    EMAIL_PATTERN,
    normalizeEmail,
    isValidEmail,
    normalizeEmailList
};
