export function parseDateOnly(input: string | Date): Date {
  let d: Date;
  if (input instanceof Date) {
    d = input;
  } else {
    // allow both plain dates (YYYY-MM-DD) and full ISO strings
    d = /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? new Date(`${input}T00:00:00Z`)
      : new Date(input);
  }
  return new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate()
  ));
}
