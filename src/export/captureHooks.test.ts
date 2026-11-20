import { describe, expect, it } from 'vitest'
import { DISPLAY_RATIO, beforeCapture, withCapture } from './captureHooks'

describe('withCapture', () => {
  it('prepares every hook at the export ratio, waits for them, then restores the display ratio', async () => {
    const log: string[] = []
    const offA = beforeCapture(async (ratio) => {
      await new Promise((r) => setTimeout(r, 5))
      log.push(`a${ratio}`)
    })
    const offB = beforeCapture((ratio) => void log.push(`b${ratio}`))
    const result = await withCapture(2, async () => {
      log.push('job')
      return 'blob'
    })
    expect(result).toBe('blob')
    expect(log).toEqual(['b2', 'a2', 'job', `b${DISPLAY_RATIO}`, `a${DISPLAY_RATIO}`])
    offA()
    offB()
  })

  it('restores the display ratio when the capture fails, and forgets removed hooks', async () => {
    const ratios: number[] = []
    const off = beforeCapture((ratio) => void ratios.push(ratio))
    await expect(withCapture(2, () => Promise.reject(new Error('boom')))).rejects.toThrow('boom')
    expect(ratios).toEqual([2, DISPLAY_RATIO])
    off()
    await withCapture(2, async () => {})
    expect(ratios).toHaveLength(2)
  })
})
