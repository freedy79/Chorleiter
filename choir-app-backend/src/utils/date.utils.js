function isoDateString(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function shortWeekdayDateString(date) {
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${weekdays[date.getUTCDay()]} ${day}.${month}.`;
}

function germanDateString(date) {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}.${month}.${year}`;
}

function parseDateOnly(input) {
    const d = new Date(input);
    return new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate()
    ));
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
    parseDateOnly,
    datesForRule,
};
