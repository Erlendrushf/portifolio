import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { PreviewImage } from '../components/PreviewImage.jsx'
import { ProjectArtwork } from '../components/ProjectArtwork.jsx'
import { publicAssetUrl } from '../lib/assets.js'
import { isSafePublicLink } from '../lib/urls.js'

function BackLink() {
  const location = useLocation()
  const search = typeof location.state?.catalogSearch === 'string' && location.state.catalogSearch.startsWith('?')
    ? location.state.catalogSearch
    : ''

  return (
    <Link className="back-link" to={{ pathname: '/', search }}>
      <span aria-hidden="true">←</span> All projects
    </Link>
  )
}

export function NotFound() {
  return (
    <section className="simple-page">
      <h1 tabIndex="-1">Project not found.</h1>
      <p className="intro-copy">This project may have moved or the link may be incorrect.</p>
      <BackLink />
    </section>
  )
}

function ProjectVideo({ video, title }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const source = publicAssetUrl(video.src)

  if (failedSrc === video.src) {
    return (
      <div className="video-error" role="alert">
        <p>The video could not be loaded. Check the file or try another browser.</p>
        <a href={source}>Open the video file</a>
      </div>
    )
  }

  return (
    <video
      className="project-video"
      aria-label={`Video preview of ${title}`}
      controls
      preload="metadata"
      src={source}
      poster={video.poster ? publicAssetUrl(video.poster) : undefined}
      onError={() => setFailedSrc(video.src)}
    >
      {video.captions && (
        <track kind="captions" src={publicAssetUrl(video.captions)} label="Captions" default />
      )}
      Your browser does not support embedded video. <a href={source}>Open the video file</a>.
    </video>
  )
}

function ProjectMetadata({ project }) {
  const metadata = project.metadata ?? {}
  const details = [
    ['Role', metadata.role],
    ['Status', metadata.status],
    ['Period', metadata.period],
  ].filter(([, value]) => value)

  return (
    <aside className="project-sidebar" aria-labelledby="details-heading">
      <h2 id="details-heading">Project details</h2>
      <dl>
        {details.map(([label, value]) => (
          <div className="detail-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="detail-row">
          <dt>Services</dt>
          <dd>{project.services.join(', ')}</dd>
        </div>
        {project.technologies?.length > 0 && (
          <div className="detail-row">
            <dt>Technologies</dt>
            <dd>{project.technologies.join(', ')}</dd>
          </div>
        )}
      </dl>
      {metadata.highlights?.length > 0 && (
        <div className="sidebar-section">
          <h3>Highlights</h3>
          <ul>
            {metadata.highlights.map((highlight, index) => <li key={`${highlight}-${index}`}>{highlight}</li>)}
          </ul>
        </div>
      )}
      {project.links?.length > 0 && (
        <div className="sidebar-section">
          <h3>Links</h3>
          <ul className="project-links">
            {project.links.map((link, index) => (
              <li key={`${link.label}-${index}`}>
                {isSafePublicLink(link.url) ? (
                  <a href={link.url}>{link.label} <span aria-hidden="true">↗</span></a>
                ) : (
                  <span className="invalid-link" role="status">Invalid link: {link.label}. Check this project record.</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}

export function ProjectDetail({ projectData }) {
  const { slug } = useParams()
  const project = projectData.find((entry) => entry.slug === slug)
  if (!project) return <NotFound />

  const images = project.media?.images ?? []
  const video = project.media?.video

  return (
    <article className="project-detail">
      <BackLink />
      <header className="detail-header">
        <h1 tabIndex="-1">{project.title}</h1>
        <p className="detail-summary">{project.summary}</p>
      </header>

      <div className="detail-layout">
        <div className="detail-content">
          <section className="detail-section" aria-labelledby="about-heading">
            <h2 id="about-heading">About the project</h2>
            {project.description.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          </section>

          {images.length > 0 && (
            <section className="detail-section" aria-labelledby="images-heading">
              <h2 id="images-heading">Project preview</h2>
              <div className="project-gallery">
                {images.map((image, index) => (
                  <figure key={`${image.src}-${index}`}>
                    <PreviewImage image={image} className="detail-image" />
                    {image.caption && <figcaption>{image.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {video && (
            <section className="detail-section" aria-labelledby="video-heading">
              <h2 id="video-heading">See it in motion</h2>
              <ProjectVideo video={video} title={project.title} />
              {video.transcript && (
                <a className="transcript-link" href={publicAssetUrl(video.transcript)}>Read the video transcript</a>
              )}
            </section>
          )}

          {images.length === 0 && !video && (
            <section className="detail-section" aria-labelledby="preview-heading">
              <h2 id="preview-heading">Project preview</h2>
              <p>No preview has been provided for this project.</p>
              <div className="detail-artwork">
                <ProjectArtwork project={project} />
              </div>
              <p className="detail-art-caption">Illustration for this portfolio.</p>
            </section>
          )}
        </div>
        <ProjectMetadata project={project} />
      </div>
    </article>
  )
}
