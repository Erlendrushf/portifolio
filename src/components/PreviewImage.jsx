import { useState } from 'react'
import { publicAssetUrl } from '../lib/assets.js'

export function PreviewImage({ image, className = '', decorative = false, loading = 'lazy' }) {
  const [failedSrc, setFailedSrc] = useState(null)

  if (!image || failedSrc === image.src) {
    return (
      <div className={`preview-placeholder ${className}`}>
        <span aria-hidden="true">✳</span>
        <p>{image ? 'Preview unavailable' : 'No preview provided'}</p>
      </div>
    )
  }

  return (
    <img
      className={className}
      src={publicAssetUrl(image.src)}
      alt={decorative ? '' : image.alt}
      loading={loading}
      onError={() => setFailedSrc(image.src)}
    />
  )
}
