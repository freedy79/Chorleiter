function easterSunday(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(Date.UTC(year, month - 1, day));
}

function firstSundayOfMonth(year, month) {
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

function publicHolidays(year) {
  const easter = easterSunday(year);
  const goodFriday = new Date(easter);
  goodFriday.setUTCDate(goodFriday.getUTCDate() - 2);
  const ascensionDay = new Date(easter);
  ascensionDay.setUTCDate(ascensionDay.getUTCDate() + 39);

  const christmas1 = new Date(Date.UTC(year, 11, 25));
  const christmas2 = new Date(Date.UTC(year, 11, 26));
  const entMarch = firstSundayOfMonth(year, 2);
  const entJuly = firstSundayOfMonth(year, 6);
  const entNov = firstSundayOfMonth(year, 10);

  return [goodFriday, ascensionDay, christmas1, christmas2, entMarch, entJuly, entNov];
}

function isPublicHoliday(date) {
  const iso = date.toISOString().split('T')[0];
  return publicHolidays(date.getUTCFullYear())
    .map(d => d.toISOString().split('T')[0])
    .includes(iso);
}

module.exports = { easterSunday, publicHolidays, isPublicHoliday };
