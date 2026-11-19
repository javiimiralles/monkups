import { useState } from 'react'
import { searchPhotos, trackDownload, type Photo } from '../services/unsplash'

const KEY_STORAGE = 'monkups.unsplashKey'

const readKey = () => {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

const saveKey = (key: string) => {
  try {
    localStorage.setItem(KEY_STORAGE, key)
  } catch {
    // Storage blocked: the key just lasts for this session.
  }
}

export function UnsplashPicker({ onPick }: { onPick: (photo: Photo) => void }) {
  const [key, setKey] = useState(readKey)
  const [query, setQuery] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [status, setStatus] = useState('')

  const search = async () => {
    if (!key || !query.trim()) return
    setStatus('Searching…')
    try {
      const found = await searchPhotos(key, query.trim())
      setPhotos(found)
      setStatus(found.length ? '' : 'No results')
    } catch (err) {
      setStatus((err as Error).message)
    }
  }

  return (
    <div>
      <h3 style={{ marginTop: 12 }}>Unsplash</h3>
      {!key ? (
        <>
          <input
            type="password"
            placeholder="Unsplash access key"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              const value = e.currentTarget.value.trim()
              saveKey(value)
              setKey(value)
            }}
          />
          <p className="hint">
            Paste your access key and press Enter. Get one free at{' '}
            <a href="https://unsplash.com/developers" target="_blank" rel="noreferrer">
              unsplash.com/developers
            </a>
            .
          </p>
        </>
      ) : (
        <>
          <input
            type="search"
            placeholder="Search photos"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          {status && <p className="hint">{status}</p>}
          <div className="photos">
            {photos.map((p) => (
              <button
                key={p.id}
                aria-label={`Photo by ${p.credit.name}`}
                onClick={() => {
                  trackDownload(key, p)
                  onPick(p)
                }}
              >
                <img src={p.thumb} alt="" />
              </button>
            ))}
          </div>
          <p className="hint">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault()
                saveKey('')
                setKey('')
              }}
            >
              Change access key
            </a>
          </p>
        </>
      )}
    </div>
  )
}
