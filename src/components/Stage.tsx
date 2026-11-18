import { forwardRef, useEffect, useRef, useState } from 'react'
import { backgroundCss, frameSize, shadowCss } from '../domain/scene'
import { useEditor } from '../state/editorStore'

const PADDING = 0.08

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const { mediaUrl, ratio, radius, shadow, background } = useEditor()
  const { width, height } = frameSize(ratio)
  const areaRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0.4)

  useEffect(() => {
    const area = areaRef.current
    if (!area) return
    const observer = new ResizeObserver(([entry]) => {
      const { width: aw, height: ah } = entry.contentRect
      setFit(Math.min(aw / width, ah / height))
    })
    observer.observe(area)
    return () => observer.disconnect()
  }, [width, height])

  return (
    <div className="stage-area" ref={areaRef}>
      <div style={{ width: width * fit, height: height * fit }}>
        {/* The transform lives on this wrapper so the exported node stays unscaled. */}
        <div style={{ width, height, transform: `scale(${fit})`, transformOrigin: '0 0' }}>
          <div
            ref={stageRef}
            className={background.kind === 'transparent' ? 'stage checker' : 'stage'}
            style={{ width, height, background: backgroundCss(background), padding: `${PADDING * 100}%` }}
          >
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt="Mockup media"
                className="media"
                style={{ borderRadius: radius, boxShadow: shadowCss(shadow.mode, shadow.opacity) }}
              />
            ) : (
              <div className="placeholder" style={{ borderRadius: radius }}>
                Drop, paste or choose an image
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
