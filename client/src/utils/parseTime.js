// ─── Timestamp helpers ──────────────────────────────────────────────────────
// timestamp format: "YYYYMMDDHHmmss"

export function parseTimestamp(ts) {
  if (!ts || ts.length < 8) return new Date(0);
  const year  = parseInt(ts.slice(0, 4), 10);
  const month = parseInt(ts.slice(4, 6), 10) - 1; // JS months are 0-indexed
  const day   = parseInt(ts.slice(6, 8), 10);
  const hour  = ts.length >= 10 ? parseInt(ts.slice(8, 10), 10) : 0;
  const min   = ts.length >= 12 ? parseInt(ts.slice(10, 12), 10) : 0;
  const sec   = ts.length >= 14 ? parseInt(ts.slice(12, 14), 10) : 0;
  return new Date(year, month, day, hour, min, sec);
}

export function formatTime(ts) {
  const d = parseTimestamp(ts);
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(ts) {
  const d = parseTimestamp(ts);
  return d.toLocaleDateString('ja-JP', {
    year:    'numeric',
    month:   'long',
    day:     'numeric',
    weekday: 'short',
  });
}

export function formatMonthYear(yyyymm) {
  // yyyymm = "202603"
  const year  = parseInt(yyyymm.slice(0, 4), 10);
  const month = parseInt(yyyymm.slice(4, 6), 10);
  return `${year}年${month}月`;
}

export function getMonthKey(ts) {
  // Returns "YYYYMM" for grouping
  return ts ? ts.slice(0, 6) : '';
}

export function isSameDay(ts1, ts2) {
  return ts1.slice(0, 8) === ts2.slice(0, 8);
}

export function formatRelativeDate(ts) {
  const d    = parseTimestamp(ts);
  const now  = new Date();
  const diff = now - d; // ms
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7)  return `${days}日前`;
  return d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
}
