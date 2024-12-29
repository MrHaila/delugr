import { onMounted, ref } from "vue"

const isTechnicalDetailsUiEnabled = ref(false)

function toggleTechnicalDetailsUi() {
  isTechnicalDetailsUiEnabled.value = !isTechnicalDetailsUiEnabled.value

  // Save to local storage.
  localStorage.setItem('isTechnicalDetailsUiEnabled', isTechnicalDetailsUiEnabled.value.toString())
}

export function useTechnicalDetailsUi() {
  onMounted(() => {
    // Load from local storage.
    const isEnabled = localStorage.getItem('isTechnicalDetailsUiEnabled')
    if (isEnabled === 'true') isTechnicalDetailsUiEnabled.value = true
  })

  return {
    isTechnicalDetailsUiEnabled,
    toggleTechnicalDetailsUi
  }
}