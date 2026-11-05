export function publicAssetUrl(assetPath, base = import.meta.env.BASE_URL) {
  return `${base}${assetPath.split('/').map(encodeURIComponent).join('/')}`
}
