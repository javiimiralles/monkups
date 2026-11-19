import { describe, expect, it } from 'vitest'
import { searchUrl, toPhotos } from './unsplash'

describe('searchUrl', () => {
  it('encodes the query and asks for landscape photos', () => {
    expect(searchUrl('blue sky & sea')).toBe(
      'https://api.unsplash.com/search/photos?query=blue+sky+%26+sea&per_page=12&orientation=landscape',
    )
  })
})

describe('toPhotos', () => {
  it('maps API results to photos with referral attribution', () => {
    const json = {
      results: [
        {
          id: 'abc',
          urls: {
            raw: 'https://images.unsplash.com/photo-1?ixid=1',
            small: 'https://images.unsplash.com/photo-1?w=400',
          },
          user: { name: 'Ana Pérez', links: { html: 'https://unsplash.com/@ana' } },
          links: { download_location: 'https://api.unsplash.com/photos/abc/download?ixid=1' },
        },
      ],
    }
    expect(toPhotos(json)).toEqual([
      {
        id: 'abc',
        thumb: 'https://images.unsplash.com/photo-1?w=400',
        url: 'https://images.unsplash.com/photo-1?ixid=1&w=2400&q=80',
        credit: { name: 'Ana Pérez', link: 'https://unsplash.com/@ana?utm_source=monkups&utm_medium=referral' },
        downloadLocation: 'https://api.unsplash.com/photos/abc/download?ixid=1',
      },
    ])
  })

  it('returns no photos for an unexpected payload', () => {
    expect(toPhotos({})).toEqual([])
  })
})
