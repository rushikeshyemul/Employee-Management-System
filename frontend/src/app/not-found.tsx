import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">That address is not part of Workforce Hub.</p>
        <Link href="/dashboard" className="mt-4 inline-flex h-8 items-center rounded-lg bg-primary px-3 text-sm text-primary-foreground">
          Go to overview
        </Link>
      </div>
    </main>
  );
}
