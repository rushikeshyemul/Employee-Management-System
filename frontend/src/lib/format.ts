import { env } from "@/config/env";

export function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parseDateOnly(value));
}

export function formatDateTime(
  value: string | null | undefined,
  timeZone = env.timezone,
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatTime(value: string | null | undefined, timeZone = env.timezone) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function formatMinutes(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

export function todayInTimeZone(timeZone = env.timezone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDate(days: number, timeZone = env.timezone) {
  const today = parseDateOnly(todayInTimeZone(timeZone));
  today.setDate(today.getDate() + days);
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateTimeInTimeZone(
  date: string,
  time: string,
  timeZone = env.timezone,
) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(utcGuess);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(formatted.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour"),
    read("minute"),
    read("second"),
  );
  const offset = asUtc - utcGuess.getTime();
  return new Date(utcGuess.getTime() - offset).toISOString();
}

export function greeting(now = new Date(), timeZone = env.timezone) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function personName(person: {
  first_name: string;
  last_name: string;
  preferred_name?: string | null;
}) {
  const preferred = person.preferred_name?.trim();
  if (preferred) return preferred;
  return `${person.first_name} ${person.last_name}`.trim();
}

export function initials(name: string) {
  const parts = name.split(" ").filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function startOfMonthDate(timeZone = env.timezone) {
  return `${todayInTimeZone(timeZone).slice(0, 8)}01`;
}

export function compareDate(left: string, right: string) {
  return left.slice(0, 10).localeCompare(right.slice(0, 10));
}

export function rangesOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  return startA <= endB && startB <= endA;
}
