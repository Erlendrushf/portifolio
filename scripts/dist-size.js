import { lstatSync, readdirSync } from 'node:fs'
import path from 'node:path'

export const MAX_SITE_BYTES = 1_000_000_000

export function assertSiteSize(bytes, limit = MAX_SITE_BYTES) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Site size must be a nonnegative integer.')
  if (bytes > limit) throw new Error(`Site size ${bytes} bytes exceeds the ${limit}-byte limit.`)
  return bytes
}

export function getDirectorySize(directory) {
  let total = 0
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name)
    const info = lstatSync(file)
    if (info.isDirectory()) total += getDirectorySize(file)
    else if (info.isFile()) total += info.size
    else throw new Error(`Unsupported non-regular file in build output: ${file}`)
  }
  return total
}
