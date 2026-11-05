import {
  closeSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  readdirSync,
  realpathSync,
  statSync,
} from 'node:fs'
import path from 'node:path'
import { isSafePublicLink } from '../src/lib/urls.js'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const imageExtensions = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])
const videoExtensions = new Set(['.m4v', '.mp4', '.ogv', '.webm'])
const mediaReadSize = 8192

function mediaMatches(sample, extension) {
  switch (extension) {
    case '.avif':
      return sample.toString('ascii', 4, 8) === 'ftyp' && /avi[fs]/.test(sample.toString('ascii', 8, 32))
    case '.gif':
      return /^GIF8[79]a/.test(sample.toString('ascii', 0, 6))
    case '.jpeg':
    case '.jpg':
      return sample.length >= 3 && sample[0] === 0xff && sample[1] === 0xd8 && sample[2] === 0xff
    case '.png':
      return sample.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    case '.svg':
      return /<svg(?:\s|>)/i.test(sample.toString('utf8'))
    case '.webp':
      return sample.toString('ascii', 0, 4) === 'RIFF' && sample.toString('ascii', 8, 12) === 'WEBP'
    case '.m4v':
    case '.mp4':
      return sample.toString('ascii', 4, 8) === 'ftyp'
    case '.ogv':
      return sample.toString('ascii', 0, 4) === 'OggS'
    case '.webm':
      return sample.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
    case '.vtt':
      return /^\uFEFF?WEBVTT(?:[ \t]|\r?\n|$)/.test(sample.toString('utf8'))
    default:
      return false
  }
}

function readSample(filePath) {
  const descriptor = openSync(filePath, 'r')
  try {
    const sample = Buffer.alloc(mediaReadSize)
    const length = readSync(descriptor, sample, 0, sample.length, 0)
    return sample.subarray(0, length)
  } finally {
    closeSync(descriptor)
  }
}

function transcriptMatches(filePath) {
  const descriptor = openSync(filePath, 'r')
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true })
    const buffer = Buffer.alloc(mediaReadSize)
    let hasContent = false
    let length
    while ((length = readSync(descriptor, buffer, 0, buffer.length, null)) > 0) {
      const text = decoder.decode(buffer.subarray(0, length), { stream: true })
      if (text.trim().length > 0) hasContent = true
    }
    const remaining = decoder.decode()
    return hasContent || remaining.trim().length > 0
  } catch (error) {
    if (error instanceof TypeError && error.code === 'ERR_ENCODING_INVALID_ENCODED_DATA') return false
    throw error
  } finally {
    closeSync(descriptor)
  }
}

export function validateRecord(record, { filePath, publicDir }) {
  const errors = []
  const issue = (field, message) => errors.push(`${filePath}: ${field}: ${message}`)
  const has = (value, key) => Object.hasOwn(value, key)

  function shape(value, field, allowed, required = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      issue(field, 'must be an object')
      return false
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) issue(`${field}.${key}`, 'is not a supported field')
    }
    for (const key of required) {
      if (!has(value, key)) issue(`${field}.${key}`, 'is required')
    }
    return true
  }

  function text(value, field) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      issue(field, 'must be a nonempty string')
      return false
    }
    return true
  }

  function textList(value, field, requiredItems = false) {
    if (!Array.isArray(value)) {
      issue(field, 'must be an array of strings')
      return
    }
    if (requiredItems && value.length === 0) issue(field, 'must contain at least one item')
    value.forEach((item, index) => text(item, `${field}[${index}]`))
  }

  function asset(value, field, extensions) {
    if (!text(value, field)) return
    if (
      value !== value.trim() ||
      value.startsWith('/') ||
      /[\\?#%\u0000-\u001f\u007f]/.test(value) ||
      value.split('/').some((part) => part === '' || part === '.' || part === '..')
    ) {
      issue(field, 'must be a safe path relative to public/ without query, fragment, or traversal')
      return
    }
    const extension = path.extname(value).toLowerCase()
    if (!extensions.has(extension)) {
      issue(field, `must use an expected file type (${[...extensions].join(', ')})`)
      return
    }
    try {
      const publicRoot = realpathSync(publicDir)
      const file = realpathSync(path.resolve(publicDir, ...value.split('/')))
      const relative = path.relative(publicRoot, file)
      if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        issue(field, 'must resolve inside public/')
        return
      }
      const info = statSync(file)
      if (!info.isFile()) {
        issue(field, 'must refer to an existing regular file')
        return
      }
      const matches = extension === '.txt'
        ? transcriptMatches(file)
        : mediaMatches(readSample(file), extension)
      if (!matches) {
        const expectation = extension === '.txt' ? ' (expected nonempty UTF-8 text)' : ''
        issue(field, `does not contain valid ${extension} media${expectation}`)
      }
    } catch (error) {
      issue(field, `cannot read the local media file: ${error.message}`)
    }
  }

  const rootFields = ['slug', 'title', 'summary', 'description', 'services', 'technologies', 'metadata', 'media', 'links']
  if (!shape(record, 'project', rootFields, ['slug', 'title', 'summary', 'description', 'services'])) return errors

  if (has(record, 'slug') && text(record.slug, 'slug') && !slugPattern.test(record.slug)) {
    issue('slug', 'must be lowercase kebab-case')
  }
  for (const field of ['title', 'summary']) {
    if (has(record, field)) text(record[field], field)
  }
  for (const field of ['description', 'services']) {
    if (has(record, field)) textList(record[field], field, true)
  }
  if (has(record, 'technologies')) textList(record.technologies, 'technologies')

  if (has(record, 'metadata') && shape(record.metadata, 'metadata', ['role', 'status', 'period', 'highlights'])) {
    for (const field of ['role', 'status', 'period']) {
      if (has(record.metadata, field)) text(record.metadata[field], `metadata.${field}`)
    }
    if (has(record.metadata, 'highlights')) textList(record.metadata.highlights, 'metadata.highlights')
  }

  if (has(record, 'media') && shape(record.media, 'media', ['images', 'video'])) {
    if (has(record.media, 'images')) {
      if (!Array.isArray(record.media.images)) {
        issue('media.images', 'must be an array')
      } else {
        record.media.images.forEach((image, index) => {
          const field = `media.images[${index}]`
          if (!shape(image, field, ['src', 'alt', 'caption'], ['src', 'alt'])) return
          if (has(image, 'src')) asset(image.src, `${field}.src`, imageExtensions)
          if (has(image, 'alt')) text(image.alt, `${field}.alt`)
          if (has(image, 'caption')) text(image.caption, `${field}.caption`)
        })
      }
    }
    if (has(record.media, 'video') && shape(record.media.video, 'media.video', ['src', 'poster', 'captions', 'transcript'], ['src'])) {
      const video = record.media.video
      if (has(video, 'src')) asset(video.src, 'media.video.src', videoExtensions)
      if (has(video, 'poster')) asset(video.poster, 'media.video.poster', imageExtensions)
      if (has(video, 'captions')) asset(video.captions, 'media.video.captions', new Set(['.vtt']))
      if (has(video, 'transcript')) asset(video.transcript, 'media.video.transcript', new Set(['.txt']))
    }
  }

  if (has(record, 'links')) {
    if (!Array.isArray(record.links)) {
      issue('links', 'must be an array')
    } else {
      record.links.forEach((link, index) => {
        const field = `links[${index}]`
        if (!shape(link, field, ['label', 'url'], ['label', 'url'])) return
        if (has(link, 'label')) text(link.label, `${field}.label`)
        if (has(link, 'url') && text(link.url, `${field}.url`) && !isSafePublicLink(link.url)) {
          issue(`${field}.url`, 'must be a valid HTTPS URL without embedded credentials')
        }
      })
    }
  }

  return errors
}

export function validateCatalog({ projectsDir, publicDir }) {
  const errors = []
  const records = []
  const slugs = new Map()
  let names
  try {
    names = readdirSync(projectsDir).filter((name) => name.endsWith('.json')).sort()
  } catch (error) {
    return { records, errors: [`${projectsDir}: cannot read project records: ${error.message}`] }
  }

  for (const name of names) {
    const filePath = path.join(projectsDir, name)
    let record
    try {
      if (!lstatSync(filePath).isFile()) {
        errors.push(`${filePath}: project record must be a regular file`)
        continue
      }
      record = JSON.parse(readFileSync(filePath, 'utf8'))
    } catch (error) {
      errors.push(`${filePath}: cannot read valid JSON: ${error.message}`)
      continue
    }
    errors.push(...validateRecord(record, { filePath, publicDir }))
    if (record && typeof record.slug === 'string' && slugPattern.test(record.slug)) {
      if (slugs.has(record.slug)) {
        errors.push(`${filePath}: slug: duplicate "${record.slug}" also used in ${slugs.get(record.slug)}`)
      } else {
        slugs.set(record.slug, filePath)
      }
    }
    records.push(record)
  }
  return { records, errors }
}
