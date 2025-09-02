function isoDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function shortWeekdayDateString(date) {
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return `${weekdays[date.getDay()]}, ${date.getDate()}.`;
}

function germanDateString(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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

module.exports = {
    isoDateString,
    shortWeekdayDateString,
    germanDateString,
    datesForRule,
};
