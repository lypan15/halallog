export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateLabel(date: Date, shortMonths: readonly string[]): string {
  return `${shortMonths[date.getMonth()]} ${date.getDate()}`;
}
