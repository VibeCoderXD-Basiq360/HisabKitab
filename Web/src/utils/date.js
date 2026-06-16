import { format, isToday, isYesterday } from 'date-fns';

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'd MMM yyyy');
}

export function formatTime(dateStr) {
  return format(new Date(dateStr), 'h:mm a');
}
