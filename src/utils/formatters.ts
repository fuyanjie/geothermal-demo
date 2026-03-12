const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}
