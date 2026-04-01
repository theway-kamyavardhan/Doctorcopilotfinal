export function formatDistanceToNow(dateInput, { addSuffix = false } = {}) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const future = diffMs < 0;
  const absMs = Math.abs(diffMs);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  let value;
  let unit;

  if (absMs < minute) {
    value = Math.max(1, Math.round(absMs / 1000));
    unit = "second";
  } else if (absMs < hour) {
    value = Math.round(absMs / minute);
    unit = "minute";
  } else if (absMs < day) {
    value = Math.round(absMs / hour);
    unit = "hour";
  } else if (absMs < week) {
    value = Math.round(absMs / day);
    unit = "day";
  } else if (absMs < month) {
    value = Math.round(absMs / week);
    unit = "week";
  } else if (absMs < year) {
    value = Math.round(absMs / month);
    unit = "month";
  } else {
    value = Math.round(absMs / year);
    unit = "year";
  }

  const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
  if (!addSuffix) return label;
  return future ? `in ${label}` : `${label} ago`;
}
