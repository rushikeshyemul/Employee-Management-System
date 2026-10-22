/**
 * Demo mode is a development-only data source. Production builds always use the
 * Django API, even if NEXT_PUBLIC_DATA_MODE=demo was set at build time.
 */
export function isDemoMode(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  dataMode: string | undefined = process.env.NEXT_PUBLIC_DATA_MODE,
) {
  return nodeEnv !== "production" && dataMode === "demo";
}
