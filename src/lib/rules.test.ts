import { describe, expect, it } from "vitest";
import { parseApiError } from "@/lib/api/errors";
import { parsePaginated } from "@/lib/api/pagination";
import { canClockIn, canClockOut } from "@/lib/attendance/rules";
import { countLeaveDays, exceedsBalance } from "@/lib/leave/rules";
import { decisionSchema, loginSchema } from "@/lib/validation";

describe("leave day counting", () => {
  it("counts weekdays and rejects an inverted range", () => {
    expect(countLeaveDays("2026-10-26", "2026-10-30", "none").days).toBe(5);
    expect(countLeaveDays("2026-10-30", "2026-10-26", "none").error).toMatch(/on or after/);
  });

  it("counts a partial day only on one working day", () => {
    expect(countLeaveDays("2026-10-26", "2026-10-26", "am").days).toBe(0.5);
    expect(countLeaveDays("2026-10-26", "2026-10-27", "am").error).toMatch(/same date/);
    expect(exceedsBalance(3, 2)).toBe(true);
  });
});

describe("attendance actions", () => {
  it("allows clock-in only before the day has started", () => {
    expect(canClockIn("not_started")).toBe(true);
    expect(canClockIn("clocked_out")).toBe(false);
    expect(canClockOut("clocked_in")).toBe(true);
    expect(canClockOut("clocked_out")).toBe(false);
  });
});

describe("API parsing", () => {
  it("reads Django REST field errors", () => {
    const error = parseApiError(400, { email: ["Enter a valid email."], non_field_errors: ["Invalid."] });
    expect(error.fieldErrors.email).toEqual(["Enter a valid email."]);
    expect(error.detail).toBe("Invalid.");
  });

  it("wraps a bare list as one page", () => {
    expect(parsePaginated([{ id: "1" }])).toEqual({ count: 1, next: null, previous: null, results: [{ id: "1" }] });
  });
});

describe("form schemas", () => {
  it("requires a work email and an 8 character password", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "short", remember_me: false });
    expect(result.success).toBe(false);
  });

  it("requires a comment unless the decision is approval", () => {
    expect(decisionSchema.safeParse({ decision: "reject", comment: "no" }).success).toBe(false);
    expect(decisionSchema.safeParse({ decision: "approve", comment: "" }).success).toBe(true);
    expect(decisionSchema.safeParse({ decision: "request_changes", comment: "Need dates" }).success).toBe(true);
  });
});
