import Link from "next/link";

export default function SessionExpiredPage() {
  return (
    <div>
      <h1 className="text-lg font-semibold">Session expired</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your session could not be refreshed. Sign in again to continue. Unsaved form input on the previous page was not submitted.
      </p>
      <Link href="/login" className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
        Sign in
      </Link>
    </div>
  );
}
