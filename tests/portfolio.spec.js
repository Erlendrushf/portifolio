import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { createReadStream, cpSync, lstatSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const bases = ['/', '/portfolio/']
const servers = new Map()
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.vtt': 'text/vtt; charset=utf-8',
  '.webm': 'video/webm',
}
let temporaryRoot

function createWorkspace(name) {
  const workspace = path.join(temporaryRoot, name)
  mkdirSync(workspace)
  for (const entry of ['index.html', 'package.json', 'package-lock.json', 'vite.config.js', 'src', 'public', 'scripts']) {
    cpSync(path.join(projectRoot, entry), path.join(workspace, entry), { recursive: true })
  }
  symlinkSync(
    path.join(projectRoot, 'node_modules'),
    path.join(workspace, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  )
  return workspace
}

function build(workspace, base = '/') {
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const result = spawnSync(command, ['run', 'build'], {
    cwd: workspace,
    encoding: 'utf8',
    env: { ...process.env, PORTFOLIO_BASE_PATH: base },
    shell: process.platform === 'win32',
    timeout: 120_000,
  })
  if (result.error) throw result.error
  return { status: result.status, output: `${result.stdout}\n${result.stderr}` }
}

async function serveBuild(workspace, base) {
  const root = path.join(workspace, 'dist')
  const server = createServer((request, response) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    } catch {
      response.writeHead(400).end('Invalid URL')
      return
    }
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end('Not found')
      return
    }
    const relative = pathname.slice(base.length) || 'index.html'
    const file = path.resolve(root, relative)
    if (!file.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end('Forbidden')
      return
    }
    let info
    try {
      info = lstatSync(file)
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        response.writeHead(404).end('Not found')
        return
      }
      response.writeHead(500).end(`Cannot read asset: ${error.message}`)
      return
    }
    if (!info.isFile()) {
      response.writeHead(404).end('Not found')
      return
    }
    response.setHeader('Content-Type', contentTypes[path.extname(file)] ?? 'application/octet-stream')
    response.setHeader('Accept-Ranges', 'bytes')
    let start = 0
    let end = info.size - 1
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/)
    if (range) {
      start = Number(range[1])
      end = range[2] ? Math.min(Number(range[2]), end) : end
      if (start > end || start >= info.size) {
        response.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end()
        return
      }
      response.statusCode = 206
      response.setHeader('Content-Range', `bytes ${start}-${end}/${info.size}`)
    }
    response.setHeader('Content-Length', end - start + 1)
    if (request.method === 'HEAD') response.end()
    else createReadStream(file, { start, end }).pipe(response)
  })
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  return { server, origin: `http://127.0.0.1:${server.address().port}`, base }
}

function monitorPage(page, origin) {
  const problems = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if ((url.protocol === 'http:' || url.protocol === 'https:') && url.origin !== origin) {
      problems.push(`Unexpected cross-origin request: ${request.url()}`)
    }
  })
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText
    if (failure !== 'net::ERR_ABORTED') problems.push(`Failed request: ${request.url()} (${failure})`)
  })
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`)
  })
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`Console error: ${message.text()}`)
  })
  page.on('pageerror', (error) => problems.push(`Page error: ${error.message}`))
  return () => expect(problems, 'Unexpected browser network or console errors').toEqual([])
}

test.beforeAll(async () => {
  test.setTimeout(180_000)
  temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'portfolio-e2e-'))
  for (const [index, base] of bases.entries()) {
    const workspace = createWorkspace(`site-${index}`)
    const result = build(workspace, base)
    expect(result.status, result.output).toBe(0)
    servers.set(base, await serveBuild(workspace, base))
  }
})

test.afterAll(async () => {
  for (const { server } of servers.values()) {
    await new Promise((resolve) => server.close(resolve))
  }
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true })
})

for (const base of bases) {
  test.describe(`production site at ${base}`, () => {
    test('filters, follows hash links, refreshes, navigates history, and plays video', async ({ page }) => {
      const { origin } = servers.get(base)
      const assertClean = monitorPage(page, origin)
      await page.goto(`${origin}${base}#/`)
      const collection = page.getByRole('region', { name: 'Explore the work' })
      const search = collection.getByRole('searchbox', { name: 'Search projects' })
      await collection.getByRole('button', { name: 'Automation' }).click()
      await search.fill('JavaScript')
      await expect(search).toBeFocused()
      await expect(collection.getByRole('button', { name: 'Automation' })).toHaveAttribute('aria-pressed', 'true')
      await expect(page).toHaveURL(`${origin}${base}#/?service=Automation&q=JavaScript`)
      await expect(collection.getByRole('link', { name: 'View Signal Board' })).toBeVisible()
      await expect(collection.getByRole('link', { name: 'View Fieldnotes' })).toHaveCount(0)
      await collection.getByRole('link', { name: 'View Signal Board' }).click()
      await expect(page).toHaveURL(`${origin}${base}#/projects/signal-board`)
      await expect(page.getByRole('heading', { level: 1, name: 'Signal Board' })).toBeFocused()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Signal Board' })).toBeFocused()
      const image = page.getByRole('img', { name: /Fictional Signal Board dashboard/ })
      await image.scrollIntoViewIfNeeded()
      await expect.poll(() => image.evaluate((element) => element.complete && element.naturalWidth > 0)).toBe(true)
      const video = page.getByLabel('Video preview of Signal Board')
      await expect(video).toHaveAttribute('controls', '')
      await expect(video).toHaveAttribute('preload', 'metadata')
      await video.evaluate(async (element) => { element.muted = true; await element.play() })
      await expect.poll(() => video.evaluate((element) => element.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.1)
      await page.goBack()
      await expect(search).toHaveValue('JavaScript')
      await expect(collection.getByRole('button', { name: 'Automation' })).toHaveAttribute('aria-pressed', 'true')
      await expect(page).toHaveURL(`${origin}${base}#/?service=Automation&q=JavaScript`)
      await page.goForward()
      await expect(page.getByRole('heading', { level: 1, name: 'Signal Board' })).toBeFocused()
      await page.goto(`${origin}${base}#/projects/not-a-project`)
      await expect(page.getByRole('heading', { level: 1, name: 'Project not found.' })).toBeFocused()
      await expect(page.getByRole('link', { name: 'All projects' })).toBeVisible()
      expect((await fetch(`${origin}${base}projects/signal-board`)).status).toBe(404)
      assertClean()
    })

    for (const width of [320, 768, 1440]) {
      test(`keeps catalog and detail usable at ${width}px`, async ({ page }) => {
        const { origin } = servers.get(base)
        const assertClean = monitorPage(page, origin)
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`${origin}${base}#/`)
        await page.keyboard.press('Tab')
        const skip = page.getByRole('link', { name: 'Skip to content' })
        await expect(skip).toBeFocused()
        expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none')
        await page.keyboard.press('Enter')
        await expect(page.getByRole('main')).toBeFocused()
        const filter = page.getByRole('button', { name: 'Automation' })
        await filter.focus()
        await page.keyboard.press('Enter')
        await expect(filter).toHaveAttribute('aria-pressed', 'true')
        const search = page.getByRole('searchbox', { name: 'Search projects' })
        await search.fill('JavaScript')
        await expect(search).toBeFocused()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
        await page.getByRole('link', { name: 'View Signal Board', exact: true }).click()
        await expect(page.getByRole('heading', { level: 1, name: 'Signal Board' })).toBeFocused()
        await expect(page.getByRole('complementary', { name: 'Project details' })).toBeVisible()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
        const layout = await page.evaluate(() => {
          const content = document.querySelector('.detail-content').getBoundingClientRect()
          const sidebar = document.querySelector('.project-sidebar').getBoundingClientRect()
          return { contentRight: content.right, contentBottom: content.bottom, sidebarLeft: sidebar.left, sidebarTop: sidebar.top }
        })
        if (width <= 760) expect(layout.sidebarTop).toBeGreaterThanOrEqual(layout.contentBottom)
        else expect(layout.sidebarLeft).toBeGreaterThanOrEqual(layout.contentRight)
        assertClean()
      })
    }
  })
}

test('discovers a new record and rejects invalid or duplicate records in isolation', async ({ page }) => {
  test.setTimeout(180_000)
  const workspace = createWorkspace('maintenance')
  const projectsDir = path.join(workspace, 'src/content/projects')
  const project = {
    slug: 'new-project',
    title: 'New fictional project',
    summary: 'A new approved example.',
    description: ['Added without changing UI code.'],
    services: ['Research'],
  }
  writeFileSync(path.join(projectsDir, 'new-project.json'), JSON.stringify(project))
  const successful = build(workspace)
  expect(successful.status, successful.output).toBe(0)
  const { server, origin } = await serveBuild(workspace, '/')
  try {
    const assertClean = monitorPage(page, origin)
    await page.goto(`${origin}/#/projects/new-project`)
    await expect(page.getByRole('heading', { level: 1, name: 'New fictional project' })).toBeVisible()
    await expect(page.getByText('Added without changing UI code.')).toBeVisible()
    assertClean()
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
  const badPath = path.join(projectsDir, 'invalid.json')
  writeFileSync(badPath, JSON.stringify({ ...project, slug: 'Bad Slug' }))
  const invalid = build(workspace)
  expect(invalid.status).not.toBe(0)
  expect(invalid.output).toContain('invalid.json')
  expect(invalid.output).toContain('lowercase kebab-case')
  writeFileSync(badPath, JSON.stringify(project))
  const duplicate = build(workspace)
  expect(duplicate.status).not.toBe(0)
  expect(duplicate.output).toContain('duplicate')
  expect(duplicate.output).toContain('invalid.json')
})
