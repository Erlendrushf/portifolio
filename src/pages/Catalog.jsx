import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { PreviewImage } from '../components/PreviewImage.jsx'
import { ProjectArtwork } from '../components/ProjectArtwork.jsx'
import { site } from '../siteConfig.js'

function ProjectVisual({ project, className = '', decorative = false, loading = 'lazy' }) {
  const image = project.media?.images?.[0]
  return image
    ? <PreviewImage image={image} className={className} decorative={decorative} loading={loading} />
    : <ProjectArtwork project={project} className={className} />
}

function ProjectCard({ project, catalogSearch }) {
  return (
    <article className="project-card">
      <Link
        to={`/projects/${project.slug}`}
        state={{ catalogSearch }}
        className="project-card-link"
        aria-label={`View ${project.title}`}
      >
        <div className="project-cover">
          <ProjectVisual project={project} className="project-cover-image" />
          <span className="card-arrow" aria-hidden="true">↗</span>
        </div>
        <div className="project-card-body">
          <p className="project-services">{project.services.join(' / ')}</p>
          <h3>{project.title}</h3>
          <p className="project-summary">{project.summary}</p>
          {project.technologies?.length > 0 && (
            <p className="project-technologies">{project.technologies.slice(0, 3).join(' · ')}</p>
          )}
          {project.metadata?.status === 'Fictional example' && (
            <p className="example-label">Fictional example</p>
          )}
        </div>
      </Link>
    </article>
  )
}

export function Catalog({ projects }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { search } = useLocation()
  const services = [...new Set(projects.flatMap((project) => project.services))].sort((a, b) => a.localeCompare(b))
  const requestedService = searchParams.get('service')
  const selectedService = services.includes(requestedService) ? requestedService : 'All'
  const query = searchParams.get('q') ?? ''
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const matches = projects
    .filter((project) => {
      const matchesService = selectedService === 'All' || project.services.includes(selectedService)
      const searchable = [project.title, project.summary, ...project.services, ...(project.technologies ?? [])]
      return matchesService && searchable.some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
    })
    .sort((a, b) => Number(a.metadata?.status === 'Fictional example') - Number(b.metadata?.status === 'Fictional example'))
  const featured = projects.find((project) => project.slug === site.featuredProject)
    ?? projects.find((project) => project.metadata?.status !== 'Fictional example')
    ?? projects.find((project) => project.media?.images?.length)
    ?? projects[0]

  function updateFilter(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <section className={`hero ${featured ? '' : 'hero-without-feature'}`}>
        <div className="hero-copy">
          <h1 tabIndex="-1">{site.headline}</h1>
          <p className="hero-intro">{site.introduction}</p>
          <a
            className="hero-link"
            href="#project-list"
            onClick={(event) => {
              event.preventDefault()
              document.getElementById('project-list').focus()
            }}
          >
            Explore the work <span aria-hidden="true">↓</span>
          </a>
          <ul className="hero-topics" aria-label="Areas of work">
            <li>AI agents</li>
            <li>Cloud engineering</li>
            <li>Developer tools</li>
          </ul>
        </div>
        {featured && (
          <Link
            className="hero-feature"
            to={`/projects/${featured.slug}`}
            state={{ catalogSearch: search }}
            aria-label={`View ${featured.title}, featured project`}
          >
            <div className="hero-feature-image">
              <ProjectVisual project={featured} decorative loading="eager" />
            </div>
            <div className="hero-feature-caption">
              <span><small>Featured project</small><strong>{featured.title}</strong></span>
              <span className="feature-arrow" aria-hidden="true">↗</span>
            </div>
          </Link>
        )}
      </section>

      <section className="collection" aria-labelledby="project-list" id="projects">
        <div className="collection-heading">
          <div>
            <h2 id="project-list" tabIndex="-1">Explore the work<span aria-hidden="true">.</span></h2>
            <p>Browse by area, or search for a project, platform, or tool.</p>
          </div>
          <div className="search-field">
            <label htmlFor="project-search">Search projects</label>
            <div className="search-input-wrap">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.7" />
                <path d="m15.5 15.5 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <input
                id="project-search"
                type="search"
                value={query}
                placeholder="Search projects or tools"
                onChange={(event) => updateFilter('q', event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group">
            <div className="service-filter" role="group" aria-label="Filter by service">
              <span className="filter-label">Services</span>
              {['All', ...services].map((service) => (
                <button
                  key={service}
                  type="button"
                  className="filter-button"
                  aria-pressed={selectedService === service}
                  onClick={() => updateFilter('service', service === 'All' ? '' : service)}
                >
                  {service}
                </button>
              ))}
            </div>
            <span className="filter-scroll-hint" aria-hidden="true">Scroll for more services →</span>
          </div>
          <button className="clear-filter" type="button" onClick={() => setSearchParams({}, { replace: true })}>
            Clear filters
          </button>
        </div>

        <div className="result-bar">
          <p role="status" aria-live="polite">
            {matches.length} {matches.length === 1 ? 'project' : 'projects'}
          </p>
          {projects.some((project) => project.metadata?.status === 'Fictional example') && (
            <p>Starter examples are fictional.</p>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h3>No projects yet.</h3>
            <p>Add an approved project record to begin your collection.</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="empty-state">
            <h3>No projects found.</h3>
            <p>Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="projects-grid">
            {matches.map((project) => <ProjectCard key={project.slug} project={project} catalogSearch={search} />)}
          </div>
        )}
      </section>
    </>
  )
}
