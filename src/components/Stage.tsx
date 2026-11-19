import { forwardRef, useEffect, useRef, useState } from 'react'
import { deviceAspect, fitBox, getDevice } from '../domain/devices'
import { backgroundCss, frameSize, shadowCss } from '../domain/scene'
import { useEditor } from '../state/editorStore'
import { DeviceFrame } from './DeviceFrame'

const PADDING = 0.08

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const { mediaUrl, mediaSize, deviceId, ratio, radius, shadow, background } = useEditor()
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

  const device = getDevice(deviceId)
  // CSS padding percentages resolve against the width on every side.
  const pad = PADDING * width
  const inner = { width: width - 2 * pad, height: height - 2 * pad }
  const fallbackAspect = device.kind === 'screenshot' ? inner.width / inner.height : 16 / 10
  const mediaAspect = mediaSize ? mediaSize.width / mediaSize.height : fallbackAspect
  const size = fitBox(inner, deviceAspect(device, mediaAspect))

  return (
    <div className="stage-area" ref={areaRef}>
      <div style={{ width: width * fit, height: height * fit }}>
        {/* The transform lives on this wrapper so the exported node stays unscaled. */}
        <div style={{ width, height, transform: `scale(${fit})`, transformOrigin: '0 0' }}>
          <div
            ref={stageRef}
            className={background.kind === 'transparent' ? 'stage checker' : 'stage'}
            style={{ width, height, background: backgroundCss(background) }}
          >
            <DeviceFrame
              device={device}
              width={size.width}
              height={size.height}
              radius={radius}
              shadow={shadowCss(shadow.mode, shadow.opacity)}
            >
              {mediaUrl ? (
                <img src={mediaUrl} alt="Mockup media" className="media" />
              ) : (
                <div className="placeholder">Drop, paste or choose an image</div>
              )}
            </DeviceFrame>
          </div>
        </div>
      </div>
    </div>
  )
})
