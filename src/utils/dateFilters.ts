export type TimeFilterPeriod = 'all' | '1y' | '6m' | '3m' | '1m' | '1w';

export interface TimeFilterOption {
  id: TimeFilterPeriod;
  label: string;
  description: string;
}

export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
  { id: 'all', label: 'Tüm Zamanlar', description: 'Kayıtlı tüm alım ve satışlar' },
  { id: '1y', label: 'Son 1 Yıl', description: 'Son 365 gün içindeki işlemler' },
  { id: '6m', label: 'Son 6 Ay', description: 'Son 180 gün içindeki işlemler' },
  { id: '3m', label: 'Son 3 Ay', description: 'Son 90 gün içindeki işlemler' },
  { id: '1m', label: 'Son 1 Ay', description: 'Son 30 gün içindeki işlemler' },
  { id: '1w', label: 'Son 1 Hafta', description: 'Son 7 gün içindeki işlemler' },
];

/**
 * Checks if a given date string is within the selected TimeFilterPeriod.
 */
export function isDateWithinFilter(dateString: string | undefined, filter: TimeFilterPeriod): boolean {
  if (filter === 'all') return true;
  if (!dateString) return false;

  const itemTime = new Date(dateString).getTime();
  if (isNaN(itemTime)) return true;

  const now = new Date().getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;

  let days = 365;
  switch (filter) {
    case '1w':
      days = 7;
      break;
    case '1m':
      days = 30;
      break;
    case '3m':
      days = 90;
      break;
    case '6m':
      days = 180;
      break;
    case '1y':
      days = 365;
      break;
    default:
      return true;
  }

  const thresholdTime = now - days * oneDayMs;
  return itemTime >= thresholdTime;
}
