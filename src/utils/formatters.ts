const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Format an hourly date string like "2016-03-11T08" for display.
 * Returns "Mar 11, 08:00"
 */
export function formatDate(dateStr: string): string {
  // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH" formats
  if (dateStr.includes('T')) {
    const [datePart, hourPart] = dateStr.split('T');
    const [, month, day] = datePart.split('-').map(Number);
    return `${monthNames[month - 1]} ${day}, ${hourPart.padStart(2, '0')}:00`;
  }
  const d = new Date(dateStr + 'T00:00:00');
  return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Short date format for chart X-axis ticks.
 * "2016-03-11T08" → "3/11"
 */
export function formatDateShort(dateStr: string): string {
  if (dateStr.includes('T')) {
    const [datePart] = dateStr.split('T');
    const [, month, day] = datePart.split('-').map(Number);
    return `${month}/${day}`;
  }
  const d = new Date(dateStr + 'T00:00:00');
  return `${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
}

export function formatNumber(value: number, decimals = 1): string {
  return value.toFixed(decimals);
}
