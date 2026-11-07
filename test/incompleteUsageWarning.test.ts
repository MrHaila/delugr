import { createApp, nextTick } from 'vue'
import { afterEach, expect, test } from 'vitest'
import IncompleteUsageWarning from '../src/components/IncompleteUsageWarning.vue'
import { useFileStore } from '../src/composables/useFileStore'

const { fileStore } = useFileStore()

function mount() {
  const el = document.createElement('div')
  createApp(IncompleteUsageWarning).mount(el)
  return el
}

afterEach(() => {
  fileStore.incompleteUsage = []
})

test('shows nothing when the card is clean', () => {
  fileStore.incompleteUsage = []
  expect(mount().textContent?.trim()).toBe('')
})

test('lists affected files and reasons', async () => {
  fileStore.incompleteUsage = [{ name: 'KIT041.XML', path: '/KITS/KIT041.XML', reason: 'Malformed file: error on line 1' }]
  const el = mount()
  await nextTick()
  expect(el.textContent).toContain('may be incomplete')
  expect(el.textContent).toContain('/KITS/KIT041.XML')
  expect(el.textContent).toContain('Malformed file: error on line 1')
})
