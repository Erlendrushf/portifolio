export function isSafePublicLink(value) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    !/^https:\/\//i.test(value) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) return false

  try {
    const url = new URL(value)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}
