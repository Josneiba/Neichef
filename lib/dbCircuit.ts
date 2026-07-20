/**
 * Lightweight in-memory DB circuit breaker used in development to avoid
 * repeated failing Prisma connections. This is intentionally simple and
 * process-local — suitable for local dev only.
 */
let unavailableUntil = 0
let failureCount = 0
let probeAllowed = false

// Increase base backoff to reduce aggressive reconnect attempts when the
// database is failing authentication. Keep a moderate maximum cap.
const BASE_BACKOFF = 15_000 // 15s
const MAX_BACKOFF = 10 * 60 * 1000 // 10 minutes

export function isDbAvailable() {
  if (process.env.DISABLE_DB === '1') return false
  return Date.now() >= unavailableUntil
}

export function getDbUnavailableUntil() {
  return unavailableUntil
}

export function markDbSuccess() {
  failureCount = 0
  probeAllowed = false
  unavailableUntil = 0
}

export function reportDbFailure() {
  failureCount += 1
  const backoff = Math.min(BASE_BACKOFF * Math.pow(2, Math.max(0, failureCount - 1)), MAX_BACKOFF)
  unavailableUntil = Date.now() + backoff
  probeAllowed = false
}

// Allow one probe call after the backoff period expires to test DB recovery.
export function allowProbeOnce() {
  if (Date.now() < unavailableUntil) return false
  if (probeAllowed) return false
  probeAllowed = true
  return true
}

// Backwards-compatible alias
export function markDbUnavailable(ms = 30000) {
  failureCount = 1
  unavailableUntil = Date.now() + ms
  probeAllowed = false
}

export default { isDbAvailable, reportDbFailure, markDbUnavailable, markDbSuccess, allowProbeOnce, getDbUnavailableUntil }
