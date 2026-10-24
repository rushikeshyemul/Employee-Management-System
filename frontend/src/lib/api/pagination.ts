import type { Paginated } from "@/types";

export function paginate<T>(
  items: T[],
  page = 1,
  pageSize = 20,
): Paginated<T> {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  const results = items.slice(start, start + safeSize);
  return {
    count: items.length,
    next: start + safeSize < items.length ? String(safePage + 1) : null,
    previous: safePage > 1 ? String(safePage - 1) : null,
    results,
  };
}

export function parsePaginated<T>(
  payload: unknown,
  fallbackPage = 1,
): Paginated<T> {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload as T[],
    };
  }
  if (payload && typeof payload === "object" && "results" in payload) {
    const body = payload as Partial<Paginated<T>>;
    return {
      count: body.count ?? body.results?.length ?? 0,
      next: body.next ?? null,
      previous: body.previous ?? null,
      results: body.results ?? [],
    };
  }
  return paginate([], fallbackPage);
}

export function pageCount(count: number, pageSize: number) {
  return Math.max(1, Math.ceil(count / Math.max(pageSize, 1)));
}
