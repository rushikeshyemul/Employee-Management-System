export type AuthStrategy = "cookie" | "bearer";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

export const env = {
  apiBaseUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1",
  ),
  authStrategy: (process.env.NEXT_PUBLIC_AUTH_STRATEGY === "bearer"
    ? "bearer"
    : "cookie") as AuthStrategy,
  timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata",
  sessionCookie: process.env.AUTH_SESSION_COOKIE || "wf_access",
  refreshCookie: process.env.AUTH_REFRESH_COOKIE || "wf_refresh",
};
