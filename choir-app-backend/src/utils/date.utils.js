function isoDateString(date) {
    return date.toISOString().split('T')[0];
}

function datesForRule(year, month, rule) {
    const dates = [];
    const d = new Date(Date.UTC(year, month - 1, 1));
    while (d.getUTCMonth() === month - 1) {
        if (d.getUTCDay() === rule.dayOfWeek) {
            const week = Math.floor((d.getUTCDate() - 1) / 7) + 1;
            if (!Array.isArray(rule.weeks) || rule.weeks.length === 0 || rule.weeks.includes(week)) {
                dates.push(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())));
            }
        }
        d.setUTCDate(d.getUTCDate() + 1);
    }
    return dates;
}

module.exports = { isoDateString, datesForRule };
