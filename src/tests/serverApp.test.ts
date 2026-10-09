import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { DEFAULT_LOCALE, setLocale } from '../composables/useLocale'
import { i18n } from '../locales/schema'
import ServerApp from '../ServerApp.vue'

class FakeImage {
  static created: FakeImage[] = []
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''

  constructor() {
    FakeImage.created.push(this)
  }
}

function artwork(name: string) {
  const image = FakeImage.created.find(img => img.src.endsWith(`characters/${name}`))
  if (!image) {
    throw new Error(`no preload requested for ${name}`)
  }
  return image
}

function mountServerApp() {
  return mount(ServerApp, {
    global: {
      plugins: [i18n],
      // The child panels have their own suites; stubbing keeps this file on
      // the page shell's loading gate, locale selection and collapsible boxes.
      stubs: {
        PageLoading: { template: '<div class="stub-page-loading" />' },
        TopNavbar: { template: '<nav class="stub-top-navbar" />' },
        ServerTitle: true,
        ServerDesc: true,
        ServerDemos: true,
        ServerVersion: true,
        ServerDocs: true,
      },
    },
  })
}

// v-show toggles inline display; isVisible() needs a document-attached mount.
function shown(wrapper: ReturnType<typeof mountServerApp>, selector: string) {
  return (wrapper.get(selector).element as HTMLElement).style.display !== 'none'
}

function currentLocale() {
  return (i18n.global as unknown as { locale: string }).locale
}

function setUrl(search: string) {
  window.history.replaceState(null, '', `/server/${search}`)
}

// Resolve the artwork promises, let Promise.all/finally settle, then pass the
// 100 ms reveal delay.
async function settleReveal() {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  vi.advanceTimersByTime(100)
  await nextTick()
}

describe('serverApp.vue', () => {
  beforeEach(() => {
    FakeImage.created = []
    vi.stubGlobal('Image', FakeImage)
    vi.useFakeTimers()
    setUrl('')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    setUrl('')
    setLocale(DEFAULT_LOCALE)
  })

  describe('loading gate', () => {
    it('preloads the Karl and Alamosaurus artwork under the base URL', () => {
      mountServerApp()

      const base = import.meta.env.BASE_URL
      expect(FakeImage.created.map(img => img.src).sort()).toEqual([
        `${base}characters/alamosaurus.webp`,
        `${base}characters/karl.webp`,
      ])
    })

    it('shows the loader and hides the page until the artwork settles', () => {
      const wrapper = mountServerApp()

      expect(wrapper.find('.stub-page-loading').exists()).toBe(true)
      expect(shown(wrapper, '.server-layout')).toBe(false)
      expect(shown(wrapper, '.stub-top-navbar')).toBe(false)
    })

    it('stays on the loader while one artwork image is still pending', async () => {
      const wrapper = mountServerApp()

      artwork('karl.webp').onload?.()
      await settleReveal()
      vi.advanceTimersByTime(10_000)
      await nextTick()

      expect(wrapper.find('.stub-page-loading').exists()).toBe(true)
      expect(shown(wrapper, '.server-layout')).toBe(false)
    })

    it('reveals the page 100 ms after both artwork images load', async () => {
      const wrapper = mountServerApp()

      artwork('karl.webp').onload?.()
      artwork('alamosaurus.webp').onload?.()
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()

      vi.advanceTimersByTime(99)
      await nextTick()
      expect(wrapper.find('.stub-page-loading').exists()).toBe(true)

      vi.advanceTimersByTime(1)
      await nextTick()
      expect(wrapper.find('.stub-page-loading').exists()).toBe(false)
      expect(shown(wrapper, '.server-layout')).toBe(true)
      expect(shown(wrapper, '.stub-top-navbar')).toBe(true)
    })

    it('does not block the page when an artwork image fails to load', async () => {
      const wrapper = mountServerApp()

      artwork('karl.webp').onerror?.()
      artwork('alamosaurus.webp').onload?.()
      await settleReveal()

      expect(wrapper.find('.stub-page-loading').exists()).toBe(false)
      expect(shown(wrapper, '.server-layout')).toBe(true)
    })

    it('reveals the page when every artwork image fails to load', async () => {
      const wrapper = mountServerApp()

      artwork('karl.webp').onerror?.()
      artwork('alamosaurus.webp').onerror?.()
      await settleReveal()

      expect(wrapper.find('.stub-page-loading').exists()).toBe(false)
      expect(shown(wrapper, '.server-layout')).toBe(true)
    })
  })

  describe('locale selection', () => {
    it('applies an available ?lang= locale', () => {
      setUrl('?lang=de-DE')
      mountServerApp()

      expect(currentLocale()).toBe('de-DE')
    })

    it('prefers ?lang= over the browser language', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
      setUrl('?lang=fr-FR')
      mountServerApp()

      expect(currentLocale()).toBe('fr-FR')
    })

    it('falls back to the browser language without ?lang=', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('ja-JP')
      mountServerApp()

      expect(currentLocale()).toBe('ja-JP')
    })

    it('routes an aliased browser language to its bundle', () => {
      vi.spyOn(window.navigator, 'language', 'get').mockReturnValue('zh-CN')
      mountServerApp()

      expect(currentLocale()).toBe('zh-Hans')
    })

    it('falls back to the default locale for an unshipped ?lang=', () => {
      setLocale('ja-JP')
      setUrl('?lang=xx-YY')
      mountServerApp()

      expect(currentLocale()).toBe(DEFAULT_LOCALE)
    })
  })

  describe('field-guide boxes', () => {
    it('renders both boxes expanded and collapses each independently', async () => {
      const wrapper = mountServerApp()
      const titles = wrapper.findAll('.why-title')
      expect(titles).toHaveLength(2)

      const lists = () => wrapper.findAll('.why-list')
      expect(lists()).toHaveLength(2)
      expect(lists()[0].findAll('li')).toHaveLength(6)
      expect(lists()[1].findAll('li')).toHaveLength(6)

      await titles[0].trigger('click')
      expect(lists()).toHaveLength(1)
      expect(lists()[0].classes()).not.toContain('why-list-grid')

      await titles[1].trigger('click')
      expect(lists()).toHaveLength(0)

      await titles[0].trigger('click')
      expect(lists()).toHaveLength(1)
      expect(lists()[0].classes()).toContain('why-list-grid')
    })
  })
})
