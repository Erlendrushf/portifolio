import { assertSiteSize, getDirectorySize, MAX_SITE_BYTES } from './dist-size.js'

try {
  const bytes = assertSiteSize(getDirectorySize('dist'))
  console.log(`Site size: ${bytes} bytes (limit: ${MAX_SITE_BYTES} bytes).`)
} catch (error) {
  console.error(`Build output validation failed: ${error.message}`)
  process.exitCode = 1
}
