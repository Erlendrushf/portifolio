import path from 'node:path'
import { validateCatalog } from './content-validator.js'

const result = validateCatalog({
  projectsDir: path.resolve('src/content/projects'),
  publicDir: path.resolve('public'),
})

if (result.errors.length > 0) {
  console.error(`Project content validation failed:\n${result.errors.map((error) => `- ${error}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Validated ${result.records.length} project record(s).`)
}
