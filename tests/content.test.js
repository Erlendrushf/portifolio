import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { validateCatalog, validateRecord } from '../scripts/content-validator.js'
import { assertSiteSize, getDirectorySize, MAX_SITE_BYTES } from '../scripts/dist-size.js'

const temporaryRoots = []

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'portfolio-content-'))
  temporaryRoots.push(root)
  const projectsDir = path.join(root, 'projects')
  const publicDir = path.join(root, 'public')
  mkdirSync(projectsDir)
  mkdirSync(path.join(publicDir, 'media'), { recursive: true })
  writeFileSync(path.join(publicDir, 'media', 'image.svg'), '<svg xmlns="http://www.w3.org/2000/svg"></svg>')
  writeFileSync(path.join(publicDir, 'media', 'video.webm'), Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  writeFileSync(path.join(publicDir, 'media', 'captions.vtt'), 'WEBVTT\n\n')
  writeFileSync(path.join(publicDir, 'media', 'transcript.txt'), 'A transcript.\n')
  return { root, projectsDir, publicDir }
}

function minimal(overrides = {}) {
  return {
    slug: 'example-project',
    title: 'Example project',
    summary: 'A fictional project.',
    description: ['A description.'],
    services: ['Web'],
    ...overrides,
  }
}

function withTranscript(transcript) {
  return minimal({
    media: { video: { src: 'media/video.webm', transcript } },
  })
}

function check(record, publicDir) {
  return validateRecord(record, { filePath: 'example.json', publicDir })
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('project content validation', () => {
  it('accepts a minimal record and all supported optional fields', () => {
    const { publicDir } = fixture()
    expect(check(minimal(), publicDir)).toEqual([])
    expect(check(minimal({
      technologies: ['React'],
      metadata: { role: 'Designer', status: 'Example', period: 'Concept', highlights: ['Accessible'] },
      media: {
        images: [{ src: 'media/image.svg', alt: 'Illustrative interface', caption: 'An example' }],
        video: {
          src: 'media/video.webm',
          poster: 'media/image.svg',
          captions: 'media/captions.vtt',
          transcript: 'media/transcript.txt',
        },
      },
      links: [{ label: 'Public demo', url: 'https://example.com/demo' }],
    }), publicDir)).toEqual([])
  })

  it('reports missing fields, blank strings, empty required arrays, and invalid shapes', () => {
    const { publicDir } = fixture()
    const errors = check({ slug: 'Example', title: ' ', description: [], services: 'Web' }, publicDir)
    expect(errors.join('\n')).toMatch(/project\.summary.*required/)
    expect(errors.join('\n')).toMatch(/slug.*lowercase kebab-case/)
    expect(errors.join('\n')).toMatch(/title.*nonempty/)
    expect(errors.join('\n')).toMatch(/description.*at least one/)
    expect(errors.join('\n')).toMatch(/services.*array/)
  })

  it('rejects unknown fields at every supported nesting level', () => {
    const { publicDir } = fixture()
    const errors = check(minimal({
      published: false,
      metadata: { secret: 'not supported' },
      media: {
        images: [{ src: 'media/image.svg', alt: 'Example', unknown: true }],
        video: { src: 'media/video.webm', private: true },
      },
      links: [{ label: 'Example', url: 'https://example.com', extra: true }],
    }), publicDir)
    expect(errors.join('\n')).toMatch(/project\.published.*not a supported field/)
    expect(errors.join('\n')).toMatch(/metadata\.secret.*not a supported field/)
    expect(errors.join('\n')).toMatch(/media\.images\[0\]\.unknown.*not a supported field/)
    expect(errors.join('\n')).toMatch(/media\.video\.private.*not a supported field/)
    expect(errors.join('\n')).toMatch(/links\[0\]\.extra.*not a supported field/)
  })

  it('requires image alt text and rejects invalid nested types', () => {
    const { publicDir } = fixture()
    const errors = check(minimal({
      technologies: ['React', ' '],
      metadata: { highlights: 'not an array' },
      media: { images: [{ src: 'media/image.svg' }], video: [] },
    }), publicDir)
    expect(errors.join('\n')).toMatch(/technologies\[1\].*nonempty/)
    expect(errors.join('\n')).toMatch(/metadata\.highlights.*array/)
    expect(errors.join('\n')).toMatch(/media\.images\[0\]\.alt.*required/)
    expect(errors.join('\n')).toMatch(/media\.video.*object/)
  })

  it.each([
    '../outside.svg',
    'media/../outside.svg',
    '/media/image.svg',
    'media\\image.svg',
    'media/image.svg?token=secret',
    'media/%2e%2e/image.svg',
  ])('rejects unsafe local media path %s', (src) => {
    const { publicDir } = fixture()
    const errors = check(minimal({ media: { images: [{ src, alt: 'Example' }] } }), publicDir)
    expect(errors.join('\n')).toMatch(/safe path relative to public/)
  })

  it('rejects missing files, wrong extensions, and contents that do not match the media type', () => {
    const { publicDir } = fixture()
    writeFileSync(path.join(publicDir, 'media', 'fake.png'), 'not a PNG')
    const errors = check(minimal({
      media: {
        images: [
          { src: 'media/missing.svg', alt: 'Missing image' },
          { src: 'media/image.txt', alt: 'Wrong extension' },
          { src: 'media/fake.png', alt: 'Wrong contents' },
        ],
      },
    }), publicDir)
    expect(errors.join('\n')).toMatch(/cannot read the local media file/)
    expect(errors.join('\n')).toMatch(/expected file type/)
    expect(errors.join('\n')).toMatch(/does not contain valid \.png/)
  })

  it('accepts a transcript split within a UTF-8 character but rejects incomplete text files', () => {
    const { publicDir } = fixture()
    writeFileSync(path.join(publicDir, 'media', 'long-transcript.txt'), `${'a'.repeat(8191)}\u00e9`)
    writeFileSync(path.join(publicDir, 'media', 'incomplete.txt'), Buffer.from([0xc3]))
    expect(check(withTranscript('media/long-transcript.txt'), publicDir)).toEqual([])
    expect(check(withTranscript('media/incomplete.txt'), publicDir).join('\n')).toMatch(/does not contain valid \.txt/)
  })

  it.each([
    ['an invalid byte at the beginning', Buffer.from([0xff])],
    ['an invalid byte after the first chunk', Buffer.concat([Buffer.alloc(8192, 0x61), Buffer.from([0xff])])],
    ['an invalid continuation across a chunk boundary', Buffer.concat([Buffer.alloc(8191, 0x61), Buffer.from([0xc3, 0x28])])],
    ['an invalid byte after two chunks', Buffer.concat([Buffer.alloc(16384, 0x61), Buffer.from([0xff])])],
    ['an incomplete sequence after the first chunk', Buffer.concat([Buffer.alloc(8192, 0x61), Buffer.from([0xe2, 0x82])])],
    ['an incomplete sequence at a chunk boundary', Buffer.concat([Buffer.alloc(8191, 0x61), Buffer.from([0xc3])])],
  ])('rejects a transcript with %s', (_description, contents) => {
    const { publicDir } = fixture()
    writeFileSync(path.join(publicDir, 'media', 'invalid.txt'), contents)
    expect(check(withTranscript('media/invalid.txt'), publicDir)).toEqual([
      'example.json: media.video.transcript: does not contain valid .txt media (expected nonempty UTF-8 text)',
    ])
  })

  it.each([
    ['text after an 8 KiB whitespace prefix', `${' '.repeat(8192)}Content`],
    ['a four-byte character crossing the second chunk', `${'a'.repeat(16382)}\u{1f600}`],
  ])('accepts a transcript containing %s', (_description, contents) => {
    const { publicDir } = fixture()
    writeFileSync(path.join(publicDir, 'media', 'valid.txt'), contents)
    expect(check(withTranscript('media/valid.txt'), publicDir)).toEqual([])
  })

  it.each([
    ['empty', ''],
    ['short whitespace-only', ' \t\n'],
    ['long whitespace-only', ' '.repeat(16385)],
  ])('rejects a %s transcript', (_description, contents) => {
    const { publicDir } = fixture()
    writeFileSync(path.join(publicDir, 'media', 'blank.txt'), contents)
    expect(check(withTranscript('media/blank.txt'), publicDir)).toEqual([
      'example.json: media.video.transcript: does not contain valid .txt media (expected nonempty UTF-8 text)',
    ])
  })

  it('fails the production build with a field-specific error for an invalid long transcript', () => {
    const { root, publicDir } = fixture()
    const projectsDir = path.join(root, 'src', 'content', 'projects')
    const libDir = path.join(root, 'src', 'lib')
    const scriptsDir = path.join(root, 'scripts')
    mkdirSync(projectsDir, { recursive: true })
    mkdirSync(libDir, { recursive: true })
    mkdirSync(scriptsDir)
    copyFileSync(new URL('../package.json', import.meta.url), path.join(root, 'package.json'))
    copyFileSync(new URL('../scripts/validate-content.js', import.meta.url), path.join(scriptsDir, 'validate-content.js'))
    copyFileSync(new URL('../scripts/content-validator.js', import.meta.url), path.join(scriptsDir, 'content-validator.js'))
    copyFileSync(new URL('../src/lib/urls.js', import.meta.url), path.join(libDir, 'urls.js'))
    writeFileSync(path.join(publicDir, 'media', 'invalid.txt'), Buffer.concat([
      Buffer.alloc(8192, 0x61),
      Buffer.from([0xff]),
    ]))
    writeFileSync(path.join(projectsDir, 'invalid.json'), JSON.stringify(withTranscript('media/invalid.txt')))

    const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    const result = spawnSync(command, ['run', 'build'], {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
      timeout: 30_000,
    })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(1)
    expect(result.stderr).toContain(
      'invalid.json: media.video.transcript: does not contain valid .txt media (expected nonempty UTF-8 text)',
    )
  })

  it('rejects a media symlink that resolves outside public', () => {
    const { root, publicDir } = fixture()
    writeFileSync(path.join(root, 'outside.svg'), '<svg></svg>')
    symlinkSync(path.join(root, 'outside.svg'), path.join(publicDir, 'media', 'escape.svg'))
    const errors = check(minimal({
      media: { images: [{ src: 'media/escape.svg', alt: 'Example' }] },
    }), publicDir)
    expect(errors.join('\n')).toMatch(/must resolve inside public/)
  })

  it.each([
    'http://example.com',
    'javascript:alert(1)',
    'https://user:password@example.com',
    'not a URL',
  ])('rejects unsafe link %s', (url) => {
    const { publicDir } = fixture()
    const errors = check(minimal({ links: [{ label: 'Link', url }] }), publicDir)
    expect(errors.join('\n')).toMatch(/links\[0\]\.url.*HTTPS URL/)
  })

  it('discovers records and reports duplicate slugs and malformed JSON with filenames', () => {
    const { projectsDir, publicDir } = fixture()
    writeFileSync(path.join(projectsDir, 'one.json'), JSON.stringify(minimal()))
    writeFileSync(path.join(projectsDir, 'two.json'), JSON.stringify(minimal()))
    writeFileSync(path.join(projectsDir, 'bad.json'), '{')
    const result = validateCatalog({ projectsDir, publicDir })
    expect(result.records).toHaveLength(2)
    expect(result.errors.join('\n')).toMatch(/bad\.json.*valid JSON/)
    expect(result.errors.join('\n')).toMatch(/two\.json.*duplicate.*one\.json/)
  })

  it('reports an unreadable records directory rather than treating it as empty', () => {
    const { root, publicDir } = fixture()
    const result = validateCatalog({ projectsDir: path.join(root, 'missing'), publicDir })
    expect(result.errors.join('\n')).toMatch(/cannot read project records/)
  })
})

describe('published site size', () => {
  it('accepts the exact limit and rejects one byte above it', () => {
    expect(assertSiteSize(MAX_SITE_BYTES - 1)).toBe(MAX_SITE_BYTES - 1)
    expect(assertSiteSize(MAX_SITE_BYTES)).toBe(MAX_SITE_BYTES)
    expect(() => assertSiteSize(MAX_SITE_BYTES + 1)).toThrow(/exceeds/)
    expect(() => assertSiteSize(-1)).toThrow(/nonnegative integer/)
  })

  it('counts nested files by their logical bytes', () => {
    const { root } = fixture()
    const output = path.join(root, 'dist')
    mkdirSync(path.join(output, 'assets'), { recursive: true })
    writeFileSync(path.join(output, 'index.html'), 'hello')
    writeFileSync(path.join(output, 'assets', 'file.js'), 'abc')
    expect(getDirectorySize(output)).toBe(8)
  })
})
