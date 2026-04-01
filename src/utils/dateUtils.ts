import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import 'dayjs/locale/en';
import i18n from '../i18n/config';

/**
 * Returns the "app today" date.
 * Between 00:00–03:59 the previous calendar day is treated as today,
 * so late-night matches (e.g. 23:00 kick-off) still appear under "today".
 */
export function getAppDate(): dayjs.Dayjs {
  const now = dayjs();
  return now.hour() < 4 ? now.subtract(1, 'day') : now;
}

export function getDateRange(centerDate: string, range: number = 3): string[] {
  const dates: string[] = [];
  for (let i = -range; i <= range; i++) {
    dates.push(dayjs(centerDate).add(i, 'day').format('YYYY-MM-DD'));
  }
  return dates;
}

export function formatDateLabel(date: string, t: (key: string) => string): string {
  const appToday = getAppDate();
  const today = appToday.format('YYYY-MM-DD');
  const yesterday = appToday.subtract(1, 'day').format('YYYY-MM-DD');
  const tomorrow = appToday.add(1, 'day').format('YYYY-MM-DD');

  if (date === today) return t('home.today');
  if (date === yesterday) return t('home.yesterday');
  if (date === tomorrow) return t('home.tomorrow');
  return dayjs(date).locale(i18n.language).format('DD MMM');
}

export function isToday(date: string): boolean {
  return date === getAppDate().format('YYYY-MM-DD');
}
