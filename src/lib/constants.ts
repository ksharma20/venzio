// Technical brand identifiers — single source of truth for things that are
// identifiers (not display strings) and appear across multiple files.
// Display strings (brand name, taglines, email copy) live in src/locales/en.ts.

// ─── Auth cookies ─────────────────────────────────────────────────────────────
export const COOKIE_SESSION = 'vnz_session'
export const COOKIE_OTP = 'vnz_otp_ok'

// ─── Domain verification ──────────────────────────────────────────────────────
// DNS TXT record: _venzio-verify.{domain}  IN TXT  "venzio-verify={token}"
export const DNS_VERIFY_SUBDOMAIN = '_venzio-verify'
export const DNS_VERIFY_VALUE_PREFIX = 'venzio-verify'

// ─── Database ─────────────────────────────────────────────────────────────────
export const DB_FILE = 'venzio.db'

// ─── HTTP ─────────────────────────────────────────────────────────────────────
export const GEO_USER_AGENT = 'Venzio/1.0 (presence-platform)'

// ─── Browser storage / notification tags (CheckinButtons) ────────────────────
export const STALE_NOTIF_KEY = 'vnz_stale_notif_count'
export const STALE_NOTIF_EVENT_KEY = 'vnz_stale_notif_event'
export const NOTIF_TAG_STALE = 'vnz-stale-checkin'
export const NOTIF_TAG_AUTO_CHECKOUT = 'vnz-auto-checkout'
