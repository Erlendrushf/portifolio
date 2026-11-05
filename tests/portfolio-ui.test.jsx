// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../src/App.jsx'
import { projects as catalogProjects } from '../src/content/index.js'
import { publicAssetUrl } from '../src/lib/assets.js'

const examples = [
  {
    slug: 'fieldnotes',
    title: 'Fieldnotes',
    summary: 'A fictional example for collecting ideas.',
    description: ['A longer example.'],
    services: ['Web design', 'Development'],
    technologies: ['React'],
    metadata: { status: 'Fictional example' },
    media: { images: [{ src: 'media/examples/fieldnotes.svg', alt: 'Illustrative notes' }] },
  },
  {
    slug: 'signal-board',
    title: 'Signal Board',
    summary: 'A fictional overview of work.',
    description: ['Another example.'],
    services: ['Automation', 'Development'],
    technologies: ['JavaScript'],
    metadata: { status: 'Fictional example' },
  },
]

function HistoryControls() {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <>
      <button type="button" onClick={() => navigate(-1)}>Browser back</button>
      <output data-testid="location">{location.pathname}{location.search}</output>
    </>
  )
}

function renderPortfolio({ projects = examples, path = '/' } = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App projectData={projects} />
      <HistoryControls />
    </MemoryRouter>,
  )
}

afterEach(cleanup)

describe('private-source portfolio entries', () => {
  const entries = [
    ['ai103-flashcards-ios', 'IQ Practice'],
    ['agent-azure-toolset', 'Agent Azure Toolset'],
    ['azure-teams-bot', 'Azure Teams Assistant'],
    ['gh-admin-app', 'GitHub Administration Hub'],
    ['github-copilot-usage-dashboard', 'Copilot Usage Dashboard'],
    ['voice-to-vault', 'Voice-to-Vault'],
    ['ghcp-canvas-docker', 'Docker Canvas for Copilot'],
  ]

  it('lists each entry as a separate navigable project', () => {
    renderPortfolio({ projects: catalogProjects })
    const collection = screen.getByRole('region', { name: 'Explore the work' })
    for (const [slug, title] of entries) {
      expect(within(collection).getByRole('link', { name: `View ${title}` }))
        .toHaveAttribute('href', `/projects/${slug}`)
    }
  })

  it.each(entries)('renders %s without source links or copied media', (slug, title) => {
    const project = catalogProjects.find((entry) => entry.slug === slug)
    expect(project).toBeDefined()
    expect(project.links).toBeUndefined()
    expect(project.media).toBeUndefined()
    renderPortfolio({ projects: catalogProjects, path: `/projects/${slug}` })
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
    for (const paragraph of project.description) {
      expect(screen.getByText(paragraph)).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: /source repository/i })).not.toBeInTheDocument()
  })
})

describe('project catalog', () => {
  it('derives service filters and displays each project with its real link', () => {
    renderPortfolio()
    const collection = screen.getByRole('region', { name: 'Explore the work' })
    expect(within(collection).getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(collection).getByRole('button', { name: 'Automation' })).toBeInTheDocument()
    expect(within(collection).getByRole('button', { name: 'Web design' })).toBeInTheDocument()
    expect(within(collection).getByRole('link', { name: 'View Fieldnotes' })).toHaveAttribute('href', '/projects/fieldnotes')
    expect(within(collection).getByRole('link', { name: 'View Signal Board' })).toHaveAttribute('href', '/projects/signal-board')
    expect(within(collection).getByText('Starter examples are fictional.')).toBeInTheDocument()
  })

  it('combines service and case-insensitive text filters without moving search focus', async () => {
    const user = userEvent.setup()
    renderPortfolio()
    const collection = screen.getByRole('region', { name: 'Explore the work' })
    const search = within(collection).getByRole('searchbox', { name: 'Search projects' })
    await user.click(within(collection).getByRole('button', { name: 'Automation' }))
    await user.type(search, 'JAVASCRIPT')
    expect(search).toHaveFocus()
    expect(within(collection).getByRole('link', { name: 'View Signal Board' })).toBeInTheDocument()
    expect(within(collection).queryByRole('link', { name: 'View Fieldnotes' })).not.toBeInTheDocument()
    expect(within(collection).getByRole('status')).toHaveTextContent('1 project')
    await user.clear(search)
    await user.type(search, 'React')
    expect(within(collection).getByText('No projects found.')).toBeInTheDocument()
    expect(search).toHaveFocus()
    await user.click(within(collection).getByRole('button', { name: 'Clear filters' }))
    expect(within(collection).getByRole('status')).toHaveTextContent('2 projects')
  })

  it.each(['fieldnotes', 'collecting', 'web design', 'react'])(
    'searches title, summary, services, and technologies for %s',
    async (query) => {
      const user = userEvent.setup()
      renderPortfolio()
      await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), query)
      const collection = screen.getByRole('region', { name: 'Explore the work' })
      expect(within(collection).getByRole('link', { name: 'View Fieldnotes' })).toBeInTheDocument()
      expect(within(collection).queryByRole('link', { name: 'View Signal Board' })).not.toBeInTheDocument()
    },
  )

  it('distinguishes an empty collection from a search with no matches', async () => {
    const user = userEvent.setup()
    const { unmount } = renderPortfolio({ projects: [] })
    expect(screen.getByText('No projects yet.')).toBeInTheDocument()
    unmount()
    renderPortfolio()
    await user.type(screen.getByRole('searchbox', { name: 'Search projects' }), 'not present')
    expect(screen.getByText('No projects found.')).toBeInTheDocument()
    expect(screen.queryByText('No projects yet.')).not.toBeInTheDocument()
  })

  it('restores service and search state when returning from a project', async () => {
    const user = userEvent.setup()
    renderPortfolio()
    const collection = screen.getByRole('region', { name: 'Explore the work' })
    await user.click(within(collection).getByRole('button', { name: 'Automation' }))
    await user.type(within(collection).getByRole('searchbox', { name: 'Search projects' }), 'JavaScript')
    await user.click(within(collection).getByRole('link', { name: 'View Signal Board' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Signal Board' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Browser back' }))
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toHaveValue('JavaScript')
    expect(screen.getByRole('button', { name: 'Automation' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('location')).toHaveTextContent('/?service=Automation&q=JavaScript')
  })

  it('lets keyboard users reach the catalog controls and skip navigation without changing routes', async () => {
    const user = userEvent.setup()
    renderPortfolio()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('main')).toHaveFocus()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    await user.tab()
    expect(screen.getByRole('link', { name: 'Explore the work' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: /View Fieldnotes, featured project/i })).toHaveFocus()
    const filter = screen.getByRole('button', { name: 'Automation' })
    filter.focus()
    await user.keyboard('{Enter}')
    expect(filter).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('project details and media', () => {
  const image = { src: 'media/examples/fieldnotes.svg', alt: 'Illustrative notes', caption: 'An example preview' }
  const video = {
    src: 'media/examples/signal-motion.webm',
    poster: 'media/examples/fieldnotes.svg',
    captions: 'media/examples/captions.vtt',
    transcript: 'media/examples/transcript.txt',
  }

  it('renders the narrative and available sidebar metadata without requiring optional fields', () => {
    renderPortfolio({ path: '/projects/fieldnotes' })
    expect(screen.getByRole('heading', { level: 1, name: 'Fieldnotes' })).toHaveFocus()
    expect(screen.getByText('A longer example.')).toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', { name: 'Project details' })
    expect(within(sidebar).getByText('Web design, Development')).toBeInTheDocument()
    expect(within(sidebar).getByText('React')).toBeInTheDocument()
    expect(within(sidebar).getByText('Fictional example')).toBeInTheDocument()
    expect(within(sidebar).queryByText('Role')).not.toBeInTheDocument()
  })

  it('supports an image-only project with accessible alt text and caption', () => {
    const project = { ...examples[0], media: { images: [image] } }
    renderPortfolio({ projects: [project], path: '/projects/fieldnotes' })
    expect(screen.getByRole('img', { name: 'Illustrative notes' })).toHaveAttribute('src', '/media/examples/fieldnotes.svg')
    expect(screen.getByText('An example preview')).toBeInTheDocument()
    expect(screen.queryByLabelText('Video preview of Fieldnotes')).not.toBeInTheDocument()
  })

  it('supports video-only and combined media with controls, caption track, and transcript', () => {
    const project = { ...examples[0], media: { video } }
    const { unmount } = renderPortfolio({ projects: [project], path: '/projects/fieldnotes' })
    let player = screen.getByLabelText('Video preview of Fieldnotes')
    expect(player).toHaveAttribute('controls')
    expect(player).toHaveAttribute('preload', 'metadata')
    expect(player).not.toHaveAttribute('autoplay')
    expect(player).toHaveAttribute('poster', '/media/examples/fieldnotes.svg')
    expect(player.querySelector('track')).toHaveAttribute('src', '/media/examples/captions.vtt')
    expect(screen.getByRole('link', { name: 'Read the video transcript' })).toHaveAttribute('href', '/media/examples/transcript.txt')
    expect(screen.queryByRole('img', { name: 'Illustrative notes' })).not.toBeInTheDocument()
    unmount()

    renderPortfolio({ projects: [{ ...project, media: { images: [image], video } }], path: '/projects/fieldnotes' })
    player = screen.getByLabelText('Video preview of Fieldnotes')
    expect(player).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Illustrative notes' })).toBeInTheDocument()
  })

  it('shows a useful state when a project has no media or metadata', () => {
    const project = { ...examples[0], metadata: undefined, media: undefined, technologies: undefined }
    renderPortfolio({ projects: [project], path: '/projects/fieldnotes' })
    expect(screen.getByText('No preview has been provided for this project.')).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Project details' })).toHaveTextContent('Web design, Development')
  })

  it('shows actionable fallbacks when an image or video fails', () => {
    const project = { ...examples[0], media: { images: [image], video } }
    renderPortfolio({ projects: [project], path: '/projects/fieldnotes' })
    fireEvent.error(screen.getByRole('img', { name: 'Illustrative notes' }))
    expect(screen.getByText('Preview unavailable')).toBeInTheDocument()
    fireEvent.error(screen.getByLabelText('Video preview of Fieldnotes'))
    expect(screen.getByRole('alert')).toHaveTextContent('The video could not be loaded')
    expect(screen.getByRole('link', { name: 'Open the video file' })).toHaveAttribute('href', '/media/examples/signal-motion.webm')
  })

  it('renders only safe public links and makes invalid content visible', () => {
    const project = {
      ...examples[0],
      links: [
        { label: 'Public demo', url: 'https://example.com/demo' },
        { label: 'Unsafe', url: 'javascript:alert(1)' },
      ],
    }
    renderPortfolio({ projects: [project], path: '/projects/fieldnotes' })
    expect(screen.getByRole('link', { name: 'Public demo' })).toHaveAttribute('href', 'https://example.com/demo')
    expect(screen.queryByRole('link', { name: 'Unsafe' })).not.toBeInTheDocument()
    const sidebar = screen.getByRole('complementary', { name: 'Project details' })
    expect(within(sidebar).getByRole('status')).toHaveTextContent('Invalid link: Unsafe')
  })

  it('focuses an unknown project heading and offers a route back', () => {
    renderPortfolio({ path: '/projects/missing' })
    expect(screen.getByRole('heading', { level: 1, name: 'Project not found.' })).toHaveFocus()
    expect(screen.getByRole('link', { name: 'All projects' })).toHaveAttribute('href', '/')
  })

  it('focuses project headings on navigation and preserves catalog filters through the back link', async () => {
    const user = userEvent.setup()
    renderPortfolio()
    const collection = screen.getByRole('region', { name: 'Explore the work' })
    await user.click(within(collection).getByRole('button', { name: 'Automation' }))
    await user.type(within(collection).getByRole('searchbox', { name: 'Search projects' }), 'JavaScript')
    await user.click(within(collection).getByRole('link', { name: 'View Signal Board' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Signal Board' })).toHaveFocus()
    await user.click(screen.getByRole('link', { name: 'All projects' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Ideas, built to be explored.' })).toHaveFocus()
    expect(screen.getByRole('searchbox', { name: 'Search projects' })).toHaveValue('JavaScript')
    expect(screen.getByRole('button', { name: 'Automation' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('resolves public assets against root and repository bases', () => {
    expect(publicAssetUrl('media/a photo.svg', '/')).toBe('/media/a%20photo.svg')
    expect(publicAssetUrl('media/a photo.svg', '/portfolio/')).toBe('/portfolio/media/a%20photo.svg')
  })
})
