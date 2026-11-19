// Unsplash API: the user supplies their own access key (single-user, browser-only app).
const API = 'https://api.unsplash.com'
const REFERRAL = 'utm_source=monkups&utm_medium=referral'

export type Photo = {
  id: string
  thumb: string
  url: string
  credit: { name: string; link: string }
  downloadLocation: string
}

export function searchUrl(query: string): string {
  const params = new URLSearchParams({ query, per_page: '12', orientation: 'landscape' })
  return `${API}/search/photos?${params}`
}

type ApiPhoto = {
  id: string
  urls: { raw: string; small: string }
  user: { name: string; links: { html: string } }
  links: { download_location: string }
}

export function toPhotos(json: unknown): Photo[] {
  const results = (json as { results?: ApiPhoto[] }).results ?? []
  return results.map((p) => ({
    id: p.id,
    thumb: p.urls.small,
    url: `${p.urls.raw}&w=2400&q=80`,
    credit: { name: p.user.name, link: `${p.user.links.html}?${REFERRAL}` },
    downloadLocation: p.links.download_location,
  }))
}

const auth = (key: string) => ({ headers: { Authorization: `Client-ID ${key}` } })

export async function searchPhotos(key: string, query: string): Promise<Photo[]> {
  const res = await fetch(searchUrl(query), auth(key))
  if (!res.ok) throw new Error(res.status === 401 ? 'Invalid Unsplash access key' : `Unsplash error ${res.status}`)
  return toPhotos(await res.json())
}

/** Unsplash API guidelines require pinging the download endpoint when a photo is used. */
export function trackDownload(key: string, photo: Photo): void {
  fetch(photo.downloadLocation, auth(key)).catch(() => {})
}
