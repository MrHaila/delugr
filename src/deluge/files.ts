import { useFileStore, type ParsedAssetFile, type SampleFile } from "../composables/useFileStore"

const { fileStore } = useFileStore()

/**
 * Get the stored URL of a sample based on its path. Also good for checking if the sample exists.
 * @param path Sample path.
 * @returns The URL to the sample's details page or null if not found.
 */
export function getSampleUrlByPath(path: string | null | undefined) {
  if (!path) return null
  if (path[0] !== '/') path = '/' + path
  const file = fileStore.samples.find(f => f.path.toLowerCase() === path?.toLowerCase())
  if (file) return file.url
  else return null
}

/**
 * Get the stored sample based on its path. Also good for checking if the sample exists.
 * @param path Sample path.
 * @returns Sample details or null if not found.
 */
export function getSampleByPath(path: string | null | undefined) {
  if (!path) return null
  if (path[0] !== '/') path = '/' + path
  const file = fileStore.samples.find(f => f.path.toLowerCase() === path?.toLowerCase())
  if (file) return file
  else return null
}

/**
 * Likely match for a Missing sample: the sample with the same file name (ignoring case) in the most similar folder.
 * Only a suggestion; nothing is re-pointed.
 * @param movedPath The missing sample path.
 * @param samples Samples to search. Defaults to the store.
 * @returns The best match, or null if no sample has the same file name.
 */
export function findLikeliestMatchForMisplacedSample(movedPath: string, samples: SampleFile[] = fileStore.samples): SampleFile | null {
  movedPath = '/' + movedPath.replace(/\\/g, '/').replace(/^\//, '')
  const movedFileName = movedPath.split('/').pop()?.toLowerCase()
  const movedFolderName = movedPath.substring(0, movedPath.lastIndexOf('/'))

  let bestMatch: SampleFile | null = null
  let bestScore = -1

  for (const sample of samples) {
    const existingFileName = sample.path.split('/').pop()?.toLowerCase()
    const existingFolderName = sample.path.substring(0, sample.path.lastIndexOf('/'))

    if (existingFileName !== movedFileName) {
      continue
    }

    const score = similarityScore(existingFolderName, movedFolderName)
    if (score > bestScore) {
      bestScore = score
      bestMatch = sample
    }
  }

  return bestMatch
}

/**
 * Based on the Levenshtein distance algorithm.
 */
function similarityScore(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  if (len1 === 0 || len2 === 0) {
    return 0;
  }

  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1.charAt(i - 1) === s2.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        const deletion = matrix[i - 1][j] + 1;
        const insertion = matrix[i][j - 1] + 1;
        const substitution = matrix[i - 1][j - 1] + 1;
        matrix[i][j] = Math.min(deletion, insertion, substitution);
      }
    }
  }

  const maxScore = Math.max(len1, len2);
  const score = 1 - matrix[len1][len2] / maxScore;

  return score;
}

/**
 * A file that a sample rename will rewrite, with its new text.
 */
export type PlannedRewrite = {
  name: string,
  path: string,
  fileHandle: FileSystemFileHandle,
  newText: string,
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace every reference to a sample path in raw XML text, ignoring case. Only whole values match: the path must sit
 * between quotes or tags (an optional leading `/` written in the file is kept). Everything else stays byte-for-byte.
 * @param text Raw file text.
 * @param oldPath Sample path, with or without a leading `/`.
 * @param newPath Replacement path, with or without a leading `/`. Written without one, as the Deluge does.
 */
export function replaceSamplePath(text: string, oldPath: string, newPath: string): string {
  const strip = (path: string) => path.replace(/\\/g, '/').replace(/^\//, '')
  const pattern = new RegExp(`(?<=["'>]/?)${escapeRegExp(strip(oldPath))}(?=["'<])`, 'gi')
  return text.replace(pattern, () => strip(newPath))
}

/**
 * Every file whose raw text may reference a sample: parsed songs, synths and kits (Malformed ones included), and
 * skipped XML files (e.g. unsupported firmware).
 */
function rewriteCandidates() {
  return [
    ...fileStore.songs,
    ...fileStore.sounds,
    ...fileStore.kits,
    ...fileStore.skippedFiles.filter(f => f.name.toLowerCase().endsWith('.xml')),
  ]
}

/**
 * Work out which files a sample rename rewrites, reading each file fresh from disk. Nothing is written.
 * Throws if the new name is invalid, only changes case, or clashes with an existing sample.
 */
export async function planSampleRename(sample: SampleFile, newName: string): Promise<PlannedRewrite[]> {
  const newPath = validateNewSampleName(sample, newName)
  if (fileStore.samples.some(s => s.path.toLowerCase() === newPath.toLowerCase())) throw new Error(`A sample named '${newName}' already exists.`)

  const plan: PlannedRewrite[] = []
  for (const file of rewriteCandidates()) {
    const text = await (await file.fileHandle.getFile()).text()
    const newText = replaceSamplePath(text, sample.path, newPath)
    if (newText !== text) plan.push({ name: file.name, path: file.path, fileHandle: file.fileHandle, newText })
  }
  return plan
}

function validateNewSampleName(sample: SampleFile, newName: string) {
  if (!newName || /[\\/:*?"<>|]/.test(newName) || newName.startsWith('.')) throw new Error(`'${newName}' is not a valid file name.`)
  if (newName === sample.name) throw new Error('The new name is the same as the old one.')
  if (newName.toLowerCase() === sample.name.toLowerCase()) throw new Error('Changing only the case of a name is not supported (the card ignores case).')
  return sample.path.substring(0, sample.path.lastIndexOf('/') + 1) + newName
}

/**
 * Rename a sample file and rewrite every file that references it, as planned by `planSampleRename`.
 * The old file is removed last, so a failure part-way leaves it in place.
 * Re-scan the card afterwards: Usage and the store are not updated here.
 * @param root The card's root folder.
 * @param sample The sample to rename.
 * @param newName New file name (not a path).
 * @param plan Files to rewrite, from `planSampleRename`.
 */
export async function renameSample(root: FileSystemDirectoryHandle, sample: SampleFile, newName: string, plan: PlannedRewrite[]) {
  validateNewSampleName(sample, newName)

  // Find the sample's folder
  let folder = root
  for (const part of sample.path.split('/').slice(1, -1)) folder = await folder.getDirectoryHandle(part)

  // Never overwrite an existing file
  const exists = await folder.getFileHandle(newName).then(() => true, () => false)
  if (exists) throw new Error(`A file named '${newName}' already exists.`)

  // Copy the sample to its new name
  const newFileHandle = await folder.getFileHandle(newName, { create: true })
  const writable = await newFileHandle.createWritable()
  await writable.write(await sample.fileHandle.getFile())
  await writable.close()

  // Rewrite references
  for (const rewrite of plan) await writeText(rewrite.fileHandle, rewrite.newText)

  // Remove the old file
  await folder.removeEntry(sample.name)
}

async function writeText(fileHandle: FileSystemFileHandle, text: string) {
  const writable = await fileHandle.createWritable()
  await writable.write(text)
  await writable.close()
}

/**
 * Re-point one file's references from one sample path to another, ignoring case. Writes only if something changed.
 * Usage is not updated: re-scan afterwards.
 */
export async function remapSampleInParsedAssetFile(parsedFile: ParsedAssetFile, oldPath: string, newPath: string) {
  const newXml = replaceSamplePath(parsedFile.xml, oldPath, newPath)
  if (newXml === parsedFile.xml) return

  await writeText(parsedFile.fileHandle, newXml)
  parsedFile.xml = newXml
}
