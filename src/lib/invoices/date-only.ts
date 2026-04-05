const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

function toCalendarTuple(date: Date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()] as const;
}

export function parseDateOnlyInput(value: string): Date {
  const match = dateOnlyPattern.exec(value.trim());

  if (!match) {
    throw new Error("Date must use YYYY-MM-DD format.");
  }

  const [, year, month, day] = match;
  const parsedYear = Number(year);
  const parsedMonth = Number(month) - 1;
  const parsedDay = Number(day);
  const date = new Date(parsedYear, parsedMonth, parsedDay, 12, 0, 0, 0);

  if (
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth ||
    date.getDate() !== parsedDay
  ) {
    throw new Error("Date must be a real calendar date.");
  }

  return date;
}

export function compareDateOnly(left: Date, right: Date): number {
  const [leftYear, leftMonth, leftDay] = toCalendarTuple(left);
  const [rightYear, rightMonth, rightDay] = toCalendarTuple(right);

  if (leftYear !== rightYear) {
    return leftYear - rightYear;
  }

  if (leftMonth !== rightMonth) {
    return leftMonth - rightMonth;
  }

  return leftDay - rightDay;
}

export function formatDateOnly(date: Date, locale = "en-US"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}
