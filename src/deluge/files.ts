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
 * Look through all known samples and find the one that most closely matches the given path. Assumes that the file name is the same.
 * @param movedPath 
 */
export function findLikeliestMatchForMisplacedSample(movedPath: string) {
  const movedFileName = movedPath.split('/').pop()
  const movedFolderName = movedPath.substring(0, movedPath.lastIndexOf('/'))

  let bestMatch: SampleFile | null = null
  let bestScore = 0

  for (const sample of fileStore.samples) {
    const existingFileName = sample.path.split('/').pop()
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

  return bestMatch!
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

export async function remapSampleInParsedAssetFile(parsedFile: ParsedAssetFile, oldPath: string, newPath: string) {
  newPath = newPath.replace(/\\/g, '/') // Normalize path separators. Deluge does not start with a backslash, while the file system does.

  console.log(`Remapping sample in ${parsedFile.name}: ${oldPath} -> ${newPath}`)

  // Find instances of the old path in the parsed file and replace them with the new path
  const newXml = parsedFile.xml.replace(new RegExp(oldPath, 'g'), newPath)

  // Write the new XML to the file
  const writeStream = await parsedFile.fileHandle.createWritable()
  await writeStream.write(newXml)
  await writeStream.close()

  // Update the parsed file
  parsedFile.xml = newXml

  // TODO: Update the sample usage. Maybe show a notification to trigger re-scanning all files at once to avoid monkeying around with individual files?
}

