import { describe, expect, it } from "vitest";
import { isDemoMode } from "@/lib/demo-mode";

describe("isDemoMode", () => {
  it("stays off in production even when the data mode flag is demo", () => {
    expect(isDemoMode("production", "demo")).toBe(false);
  });

  it("is on only for a non-production build that explicitly selects demo", () => {
    expect(isDemoMode("development", "demo")).toBe(true);
    expect(isDemoMode("test", "demo")).toBe(true);
    expect(isDemoMode("development", "api")).toBe(false);
    expect(isDemoMode("development", "")).toBe(false);
  });
});
