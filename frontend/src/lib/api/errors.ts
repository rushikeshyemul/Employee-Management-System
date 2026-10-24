export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    status: number,
    detail: string,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

function asMessages(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.flatMap((item) => asMessages(item));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => asMessages(item));
  }
  return [];
}

export function parseApiError(status: number, payload: unknown): ApiError {
  if (!payload || typeof payload !== "object") {
    return new ApiError(status, fallbackDetail(status));
  }

  const body = payload as Record<string, unknown>;
  const fieldErrors: Record<string, string[]> = {};

  if (typeof body.detail === "string") {
    return new ApiError(status, body.detail);
  }

  if (Array.isArray(body.non_field_errors)) {
    fieldErrors.non_field_errors = asMessages(body.non_field_errors);
  }

  for (const [key, value] of Object.entries(body)) {
    if (key === "detail" || key === "non_field_errors") continue;
    const messages = asMessages(value);
    if (messages.length) fieldErrors[key] = messages;
  }

  const detail =
    fieldErrors.non_field_errors?.[0] ??
    Object.values(fieldErrors)[0]?.[0] ??
    fallbackDetail(status);

  return new ApiError(status, detail, fieldErrors);
}

function fallbackDetail(status: number) {
  if (status === 401) return "Your session has expired. Sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "The requested record was not found.";
  if (status >= 500) return "The server could not complete the request.";
  return "The request could not be completed.";
}

export function errorMessage(error: unknown) {
  if (error instanceof ApiError) return error.detail;
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Try again.";
}
