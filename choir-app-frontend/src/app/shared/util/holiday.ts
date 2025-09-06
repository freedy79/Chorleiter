export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March,4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function sameDate(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth() === b.getUTCMonth() &&
         a.getUTCDate() === b.getUTCDate();
}

function previousSunday(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1));
  let counter = 0;
  while ((d.getUTCDay() !== 0) && (counter < 365)) {
    d.setUTCDate(d.getUTCDate() - 1);
    counter++;
    console.log("DAte: ", d.toUTCString(), " counter ", counter);
  }
  return d;
}

function firstSundayOfMonth(year: number, month: number): Date {
  const d = new Date(Date.UTC(year, month, 1));
  while (d.getUTCDay() !== 0) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

export function getHolidayName(date: Date): string | null {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();

  if ([2, 6, 10].includes(month)) {
    if (sameDate(date, firstSundayOfMonth(year, month))) {
      return 'Entschlafenengottesdienst';
    }
  }

  if (month === 0 && day === 1) return 'Neujahr';
  if (month === 11 && day === 24) return 'Heiligabend';
  if (month === 11 && day === 25) return '1. Weihnachtstag';
  if (month === 11 && day === 26) return '2. Weihnachtstag';

  const easter = easterSunday(year);
  const goodFriday = new Date(easter); goodFriday.setUTCDate(easter.getUTCDate() - 2);
  if (sameDate(date, goodFriday)) return 'Karfreitag';
  if (sameDate(date, easter)) return 'Ostersonntag';
  const easterMonday = new Date(easter); easterMonday.setUTCDate(easter.getUTCDate() + 1);
  if (sameDate(date, easterMonday)) return 'Ostermontag';
  const pentecost = new Date(easter); pentecost.setUTCDate(easter.getUTCDate() + 49);
  if (sameDate(date, pentecost)) return 'Pfingstsonntag';
  const pentecostMonday = new Date(pentecost); pentecostMonday.setUTCDate(pentecost.getUTCDate() + 1);
  if (sameDate(date, pentecostMonday)) return 'Pfingstmontag';

  const advent4 = previousSunday(new Date(Date.UTC(year, 11, 25)));
  const advent3 = new Date(advent4); advent3.setUTCDate(advent4.getUTCDate() - 7);
  const advent2 = new Date(advent3); advent2.setUTCDate(advent3.getUTCDate() - 7);
  const advent1 = new Date(advent2); advent1.setUTCDate(advent2.getUTCDate() - 7);
  if (sameDate(date, advent1)) return '1. Advent';
  if (sameDate(date, advent2)) return '2. Advent';
  if (sameDate(date, advent3)) return '3. Advent';
  if (sameDate(date, advent4)) return '4. Advent';

  console.log("Penance");
  const penance = new Date(Date.UTC(year, 10, 23 + 1));
  let counter = 0;
  while ((penance.getUTCDay() !== 3) && (counter < 365)) {
    penance.setUTCDate(penance.getUTCDate() - 1);
    counter++
    console.log("Penance date: ", penance.toUTCString());
  }
  if (sameDate(date, penance)) return 'Bu\u00df- und Bettag';

  return null;
}
