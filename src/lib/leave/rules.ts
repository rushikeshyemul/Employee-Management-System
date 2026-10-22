import type { PartialDay } from "@/types";
import { parseDateOnly } from "@/lib/format";

export interface LeaveDayCount {
  days: number;
  error?: string;
}

export function countLeaveDays(
  start: string,
  end: string,
  partial: PartialDay,
  workWeek: number[] = [1, 2, 3, 4, 5],
): LeaveDayCount {
  if (!start || !end) return { days: 0, error: "Choose a start and end date." };
  if (end < start) {
    return { days: 0, error: "End date must be on or after the start date." };
  }
  if (partial !== "none") {
    if (start !== end) {
      return {
        days: 0,
        error: "A partial day must start and end on the same date.",
      };
    }
    const weekday = parseDateOnly(start).getDay();
    if (!workWeek.includes(weekday)) {
      return { days: 0, error: "The selected date is not a working day." };
    }
    return { days: 0.5 };
  }

  const cursor = parseDateOnly(start);
  const last = parseDateOnly(end);
  let days = 0;
  while (cursor <= last) {
    if (workWeek.includes(cursor.getDay())) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  if (days === 0) {
    return {
      days: 0,
      error: "The selected range does not include a working day.",
    };
  }
  return { days };
}

export function exceedsBalance(days: number, available: number) {
  return days > available;
}
