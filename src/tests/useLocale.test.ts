import { afterEach, describe, expect, it } from 'vitest'
import { resolveLocale, setLocale } from '../composables/useLocale'
import { i18n } from '../locales/schema'

const DEFAULT_LOCALE = 'en-US'
const SUPPORTED_LOCALES = [
  'ar',
  'cs',
  'de-DE',
  'en-US',
  'eo',
  'es',
  'fr-FR',
  'hi',
  'id',
  'it',
  'ja-JP',
  'ko-KR',
  'nl-NL',
  'pl',
  'pt-BR',
  'ru-RU',
  'sk-SK',
  'sv',
  'tr',
  'uk',
  'vi-VN',
  'zh-HK',
  'zh-Hans',
  'zh-TW',
]

describe('useLocale', () => {
  afterEach(() => {
    setLocale(DEFAULT_LOCALE)
  })

  it('bundles the supported locales', () => {
    expect(Object.keys(i18n.global.messages).sort()).toEqual(SUPPORTED_LOCALES)
  })

  it('uses en-US as the default locale', () => {
    expect((i18n.global as any).locale).toBe(DEFAULT_LOCALE)
  })

  it('switches the active locale', () => {
    setLocale('ja-JP')
    expect((i18n.global as any).locale).toBe('ja-JP')

    setLocale('de-DE')
    expect((i18n.global as any).locale).toBe('de-DE')
  })

  it('resolves a regional tag to its bundle', () => {
    // uk-UA (issue #905) and en-GB fall back to their base language;
    // case-insensitive input still matches the exact bundle.
    expect(resolveLocale('uk-UA')).toBe('uk')
    expect(resolveLocale('en-GB')).toBe('en-US')
    expect(resolveLocale('de-de')).toBe('de-DE')
  })

  it('keeps the default for an ambiguous base language', () => {
    // zh maps to three bundles, so no single pick — leave the default on.
    expect(resolveLocale('zh')).toBeUndefined()
    expect(resolveLocale('zh-CN')).toBeUndefined()
  })

  it('returns undefined when nothing matches', () => {
    expect(resolveLocale('xx-XX')).toBeUndefined()
    expect(resolveLocale(null)).toBeUndefined()
    expect(resolveLocale(undefined)).toBeUndefined()
  })
})
