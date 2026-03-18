export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getTodayStr(timezone: string = 'UTC'): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: timezone });
}

export function isToday(dateStr: string, timezone: string = 'UTC'): boolean {
  return dateStr === getTodayStr(timezone);
}
