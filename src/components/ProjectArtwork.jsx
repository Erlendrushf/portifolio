const projectArtwork = {
  'agent-azure-toolset': 'modules',
  'ai103-flashcards-ios': 'learning',
  'azure-teams-bot': 'conversation',
  'gh-admin-app': 'governance',
  'ghcp-canvas-docker': 'containers',
  'github-copilot-usage-dashboard': 'analytics',
  'voice-to-vault': 'voice',
}

function ArtworkShape({ kind }) {
  switch (kind) {
    case 'modules':
      return (
        <>
          <path d="M140 45v22M80 90h33M167 90h33M140 113v22" />
          <rect x="115" y="65" width="50" height="50" rx="12" fill="var(--art-block)" />
          <rect x="123" y="18" width="34" height="28" rx="7" />
          <rect x="43" y="75" width="37" height="30" rx="7" />
          <rect x="200" y="75" width="37" height="30" rx="7" />
          <rect x="123" y="135" width="34" height="28" rx="7" />
          <path d="M130 90h20M140 80v20" />
        </>
      )
    case 'learning':
      return (
        <>
          <rect x="68" y="24" width="111" height="125" rx="13" transform="rotate(-8 68 24)" />
          <rect x="94" y="25" width="117" height="130" rx="13" fill="var(--art-block)" />
          <path d="M119 60h63M119 80h48M119 124h42" />
          <circle cx="124" cy="104" r="8" />
          <path d="m120 104 3 3 6-7" />
        </>
      )
    case 'conversation':
      return (
        <>
          <path d="M52 32h117a15 15 0 0 1 15 15v46a15 15 0 0 1-15 15h-41l-26 20v-20H52a15 15 0 0 1-15-15V47a15 15 0 0 1 15-15Z" fill="var(--art-block)" />
          <path d="M184 66h27a15 15 0 0 1 15 15v39a15 15 0 0 1-15 15h-15v18l-23-18h-24a15 15 0 0 1-15-15v-12" />
          <circle cx="77" cy="70" r="4" fill="currentColor" />
          <circle cx="105" cy="70" r="4" fill="currentColor" />
          <circle cx="133" cy="70" r="4" fill="currentColor" />
        </>
      )
    case 'governance':
      return (
        <>
          <rect x="48" y="28" width="151" height="122" rx="12" fill="var(--art-block)" />
          <path d="M48 54h151M71 75h47M71 94h37M71 113h31" />
          <path d="M177 78 213 90v24c0 20-14 32-36 40-22-8-36-20-36-40V90l36-12Z" fill="var(--art-bg)" />
          <path d="m163 114 10 10 18-21" />
        </>
      )
    case 'analytics':
      return (
        <>
          <rect x="43" y="31" width="194" height="120" rx="12" fill="var(--art-block)" />
          <path d="M66 125h148M67 54h55" />
          <rect x="78" y="92" width="18" height="33" rx="4" />
          <rect x="111" y="73" width="18" height="52" rx="4" />
          <rect x="144" y="84" width="18" height="41" rx="4" />
          <rect x="177" y="60" width="18" height="65" rx="4" />
          <path d="m87 78 33-18 33 11 33-24" />
        </>
      )
    case 'voice':
      return (
        <>
          <path d="M38 88h13m9-14v28m11-42v56m11-72v88m11-62v36m11-48v60m11-38v18m9-10h13" />
          <path d="M158 31h52l22 22v89a10 10 0 0 1-10 10h-64a10 10 0 0 1-10-10V41a10 10 0 0 1 10-10Z" fill="var(--art-block)" />
          <path d="M210 31v22h22M168 79h42M168 98h42M168 117h31" />
        </>
      )
    case 'containers':
      return (
        <>
          <rect x="64" y="40" width="126" height="34" rx="7" fill="var(--art-block)" />
          <rect x="80" y="79" width="126" height="34" rx="7" fill="var(--art-block)" />
          <rect x="96" y="118" width="126" height="34" rx="7" fill="var(--art-block)" />
          <path d="M82 52v10m13-10v10m13-10v10M98 91v10m13-10v10m13-10v10M114 130v10m13-10v10m13-10v10" />
          <path d="M47 58H31v77h47" />
        </>
      )
    default:
      return (
        <>
          <circle cx="140" cy="90" r="52" fill="var(--art-block)" />
          <circle cx="140" cy="90" r="28" />
          <path d="M140 17v21m0 104v21M67 90h21m104 0h21" />
          <circle cx="140" cy="90" r="5" fill="currentColor" />
        </>
      )
  }
}

export function ProjectArtwork({ project, className = '' }) {
  const kind = projectArtwork[project.slug] ?? 'general'
  const technologies = project.technologies?.slice(0, 2).join(' / ')

  return (
    <div className={`project-art project-art--${kind} ${className}`} aria-hidden="true">
      <span className="project-art-label">{project.services[0]}</span>
      <svg viewBox="0 0 280 180" fill="none" focusable="false">
        <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <ArtworkShape kind={kind} />
        </g>
      </svg>
      <span className="project-art-caption">{technologies || 'Project illustration'}</span>
    </div>
  )
}
