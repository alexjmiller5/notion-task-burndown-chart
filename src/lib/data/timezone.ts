export interface TimezoneOption {
  id: string;
  label: string;
}

export const TIMEZONES: TimezoneOption[] = [
  { id: "America/New_York", label: "New York (ET)" },
  { id: "America/Chicago", label: "Chicago (CT)" },
  { id: "America/Denver", label: "Denver (MT)" },
  { id: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { id: "America/Anchorage", label: "Anchorage (AKT)" },
  { id: "Pacific/Honolulu", label: "Honolulu (HT)" },
  { id: "UTC", label: "UTC" },
  { id: "Europe/London", label: "London (UK)" },
];

export const DEFAULT_TIMEZONE = "America/New_York";

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDateStr(value: string, tz: string): string {
  if (DATE_ONLY_RE.test(value)) return value;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(value));
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function getCurrentDateStr(tz: string, now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(now);
}

function getTimezoneOffsetMinutes(tz: string, at: Date): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

export function getStartOfDayUTC(tz: string, now: Date = new Date()): string {
  const today = getCurrentDateStr(tz, now);
  const [y, m, d] = today.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  const offsetMin = getTimezoneOffsetMinutes(tz, new Date(utcMidnight));
  return new Date(utcMidnight - offsetMin * 60_000).toISOString();
}
