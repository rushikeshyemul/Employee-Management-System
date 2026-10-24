import type { AttendanceDayStatus, AttendanceRecord } from "@/types";

export function canClockIn(status: AttendanceDayStatus) {
  return status === "not_started";
}

export function canClockOut(status: AttendanceDayStatus) {
  return status === "clocked_in" || status === "on_break";
}

export function canStartBreak(status: AttendanceDayStatus, enabled: boolean) {
  return enabled && status === "clocked_in";
}

export function canEndBreak(status: AttendanceDayStatus) {
  return status === "on_break";
}

export function workedMinutesFromStamps(
  clockIn: string | null,
  clockOut: string | null,
  breakMinutes: number,
  now = new Date(),
) {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.round((end - start) / 60000) - breakMinutes);
}

export function isMissingClockOut(record: Pick<AttendanceRecord, "clock_in_at" | "clock_out_at" | "date">, today: string) {
  return Boolean(record.clock_in_at && !record.clock_out_at && record.date < today);
}
