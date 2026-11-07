<template lang="pug">
div(v-if="!props.name") No name prop... What?

div(v-else class="flex-1 h-full overflow-y-auto p-5 bg-slate-50")
  div(v-if="!sample" class="flex justify-center my-auto")
    h1(class="font-bold text-xl text-gray-400") Sample not found! {{ fileStore.samples.length }} samples in total

  div(v-else class="space-y-5")
    div(class="flex flex-row justify-between")
      div
        h1.font-bold.text-2xl #[MicrophoneIcon(class="h-5 inline mb-1")] {{ sample.name.split('.')[0] }} #[HButton(@click="openRenameModal" size="xs") Rename]
        p(class="text-gray-400 text-sm") {{ sample.path }} #[span(class="text-xs") ({{ filesize(sample.size) }})]
      div(class="text-right text-sm mt-3")
        p Last modified: {{ DateTime.fromMillis(sample.lastModified).toFormat('yyyy-MM-dd') }}

    HCard(
      class="w-full"
      title="Preview"
      @click="wavesurfer.seekTo(0)"
      )
      div(@click.stop)#wavesurfer

    div(class="flex space-x-3")
      HCard(class="max-w-3xl flex-1" subtitle="Every sample reference on the card that points to this sample.")
        template(#title) Usage #[h-badge {{ sample.usage.length }}]
        div(v-if="usageByFile.length" class="divide-y divide-gray-200")
          div(v-for="file in usageByFile" :key="file.filePath" class="py-2")
            MusicalNoteIcon(v-if="file.fileType === 'song'" class="h-3 inline mb-1 mr-1")
            ArchiveBoxIcon(v-else-if="file.fileType === 'kit'" class="h-3 inline mb-1 mr-1")
            AdjustmentsVerticalIcon(v-else class="h-3 inline mb-1 mr-1")
            RouterLink(:to="file.fileUrl") {{ file.fileName.split('.')[0] }}
            div(v-for="line in file.lines" :key="line" class="text-xs text-gray-400 pl-4") {{ line }}

        div(v-else class="italic text-gray-400") Unused sample: no song, synth or kit references it.

    HModal(ref="renameModal" variant="warning" okButtonLabel="Rename" :onOk="renameSample")
      template(#title) Rename Sample

      div(class="space-y-3")
        IncompleteUsageWarning

        HTextField(v-model="newSampleName" label="New Name" hint="Please don't use special characters or stuff that might make Deluge sad. Stay safe.")

        p(v-if="planError" class="text-sm text-red-700") {{ planError }}
        div(v-else-if="plan" class="text-sm space-y-1")
          p This will rename the file on disk and rewrite {{ plan.length === 1 ? '1 file' : `${plan.length} files` }} that reference it:
          ul(class="list-disc pl-5 text-xs text-gray-600 max-h-48 overflow-y-auto")
            li(v-for="file in plan" :key="file.path" class="break-all") {{ file.path }}
</template>

<script lang="ts" setup>
import { MusicalNoteIcon, ArchiveBoxIcon, AdjustmentsVerticalIcon, MicrophoneIcon } from '@heroicons/vue/24/solid'
import { computed, onMounted, ref, watch } from 'vue'
import { useFileStore } from '../composables/useFileStore'
import { useRouter } from 'vue-router'
import { planSampleRename, renameSample as doRenameSample, type PlannedRewrite } from '../deluge/files'
import { describeOwner } from '../deluge/usage'
import IncompleteUsageWarning from '../components/IncompleteUsageWarning.vue'
import { DateTime } from 'luxon'
import WaveSurfer from 'wavesurfer.js'
import { filesize } from 'filesize'
import HModal from '../components/HModal.vue'
import HTextField from '../components/HTextField.vue'

const { fileStore, reParseFileStore } = useFileStore()

const props = defineProps([
  'name'
])

const router = useRouter()
const renameModal = ref<InstanceType<typeof HModal>>()
const newSampleName = ref('')
const plan = ref<PlannedRewrite[]>()
const planError = ref<string>()

function openRenameModal() {
  newSampleName.value = sample.value?.name || ''
  renameModal.value?.openModal()
}

// Work out which files the rename would rewrite whenever the name changes, so the dialog can list them.
let planRequest = 0
watch(newSampleName, async (name) => {
  const request = ++planRequest
  plan.value = undefined
  planError.value = undefined
  if (!sample.value || !name || name === sample.value.name) return
  try {
    const result = await planSampleRename(sample.value, name)
    if (request === planRequest) plan.value = result
  } catch (error) {
    if (request === planRequest) planError.value = (error as Error).message
  }
})

async function renameSample() {
  if (!sample.value || !plan.value || !fileStore.folderHandle) throw new Error(planError.value ?? 'Nothing to rename.')
  const newPath = sample.value.path.substring(0, sample.value.path.lastIndexOf('/') + 1) + newSampleName.value
  await doRenameSample(fileStore.folderHandle, sample.value, newSampleName.value, plan.value)
  await reParseFileStore()
  const renamed = fileStore.samples.find(s => s.path === newPath)
  if (renamed) await router.push(renamed.url)
}

/**
 * References grouped by file, one line per Instance/Drum with its locations.
 */
const usageByFile = computed(() => {
  const files = new Map<string, { filePath: string, fileName: string, fileUrl: string, fileType: string, lines: Map<string, string[]> }>()
  for (const ref of sample.value?.usage ?? []) {
    const file = files.get(ref.owner.filePath) ?? { ...ref.owner, lines: new Map() }
    const owner = describeOwner(ref.owner)
    file.lines.set(owner, [...(file.lines.get(owner) ?? []), ref.location])
    files.set(ref.owner.filePath, file)
  }
  return [...files.values()].map(file => ({
    ...file,
    lines: [...file.lines].map(([owner, locations]) => [owner, locations.join(', ')].filter(Boolean).join(': ')),
  }))
})

const idAsNumber = computed(() => parseInt(props.name))
const sample = computed(() => props.name ? fileStore.samples.find(sample => sample.id === idAsNumber.value) : null)

let wavesurfer: WaveSurfer

onMounted(async () => {
  wavesurfer = WaveSurfer.create({
    container: '#wavesurfer',
    waveColor: 'gray',
    progressColor: 'orange',
    barWidth: 3,
    barRadius: 3,
    cursorWidth: 1,
    barGap: 3,
    cursorColor: 'orange',
  })

  if (sample.value) {
    wavesurfer.on('ready', function(e) {
      wavesurfer.play()
    })

    // Play on click
    // wavesurfer.on('click', function(e) {
    //   wavesurfer.playPause()
    // })

    // Play after seeking
    wavesurfer.on('seeking', function(e) {
      wavesurfer.play()
    })

    const file = await sample.value.fileHandle.getFile()
    wavesurfer.loadBlob(file)
  }
})

watch(sample, (newSample, oldSample) => {
  if (newSample) {
    newSample.fileHandle.getFile().then(file => {
      wavesurfer.loadBlob(file)
    })
  }
})
</script>