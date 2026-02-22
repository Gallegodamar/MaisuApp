function parseDateInput(value?: string | null, boundary: 'start' | 'end' = 'start'): Date | null {
  if (!value) return null;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  const date =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function matchesCreatedAtDateRange(createdAt: string, from?: string | null, to?: string | null): boolean {
  const itemDate = new Date(createdAt);
  if (Number.isNaN(itemDate.getTime())) return false;

  let start = parseDateInput(from, 'start');
  let end = parseDateInput(to, 'end');

  if (start && end && start > end) {
    const tmp = start;
    start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
    end = new Date(tmp.getFullYear(), tmp.getMonth(), tmp.getDate(), 23, 59, 59, 999);
  }

  if (start && itemDate < start) return false;
  if (end && itemDate > end) return false;
  return true;
}
