import { useEffect, useRef } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { projects } from './content/index.js'
import { Catalog } from './pages/Catalog.jsx'
import { NotFound, ProjectDetail } from './pages/ProjectDetail.jsx'
import { site } from './siteConfig.js'

export default function App({ projectData = projects }) {
  const { pathname } = useLocation()
  const previousPath = useRef(pathname === '/' ? pathname : null)

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname
      document.querySelector('#main-content h1')?.focus()
    }
  }, [pathname])

  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault()
          document.getElementById('main-content').focus()
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="site-container header-inner">
          <Link className="brand" to="/" aria-label={`${site.name}, home`}>
            <span className="brand-mark" aria-hidden="true">✳</span>
            <span>{site.name}</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link className="nav-link" to="/">Projects</Link>
          </nav>
        </div>
      </header>
      <main className="site-container" id="main-content" tabIndex="-1">
        <Routes>
          <Route path="/" element={<Catalog projects={projectData} />} />
          <Route path="/projects/:slug" element={<ProjectDetail projectData={projectData} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="site-footer">
        <div className="site-container footer-inner">
          <span>{site.name}</span>
          <span>Made to be shared.</span>
        </div>
      </footer>
    </>
  )
}
