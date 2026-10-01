import { i18n } from '../locales/schema'

/**
 * Set the active locale.
 * vue-i18n is configured in LEGACY mode, where i18n.global.locale
 * is a plain string — NOT a ref. Never write .locale.value.
 */
export function setLocale(locale: string): void {
  ;(i18n.global as any).locale = locale
}

/**
 * Resolve a browser/requested language tag to a bundled locale.
 *
 * Browsers rarely report a bare bundle tag: a Ukrainian browser reports
 * `uk-UA`, a German one `de-DE`. The exact tag is only present when the
 * caller already passed a full bundle. Two steps cover both:
 *
 * 1. Case-insensitive exact match, so `UK` still resolves to `uk`.
 * 2. Base-language fallback, so `uk-UA` -> `uk` and `en-GB` -> `en-US`.
 *    This only fires when exactly one bundled locale shares the base
 *    language; `zh` / `zh-CN` stays ambiguous (zh-HK, zh-Hans, zh-TW) and
 *    resolves to nothing, leaving the default locale in place.
 *
 * Returns `undefined` when nothing matches; callers keep the default locale.
 */
export function resolveLocale(
  requested: string | null | undefined
): string | undefined {
  const available = i18n.global.availableLocales

  const needle = requested?.toLowerCase()
  const exact = available.find(loc => loc.toLowerCase() === needle)
  if (exact) {
    return exact
  }

  const base = requested?.split('-')[0].toLowerCase()
  if (!base) {
    return undefined
  }

  const matches = available.filter(loc => loc.split('-')[0] === base)
  if (matches.length === 1) {
    return matches[0]
  }

  return undefined
}
