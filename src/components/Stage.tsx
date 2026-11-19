import { forwardRef, useEffect, useRef, useState } from 'react'
import { deviceAspect, fitBox, getDevice } from '../domain/devices'
import { backgroundCss, frameSize, sceneLayer, shadowCss } from '../domain/scene'
import { rotationCss, stylePad } from '../domain/styles'
import { useEditor } from '../state/editorStore'
import { DeviceFrame } from './DeviceFrame'

const PADDING = 0.08

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const { mediaUrl, mediaSize, deviceId, ratio, radius, frameStyle, rotation, shadow, background, scene, watermark } =
    useEditor()
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
  const size = fitBox(inner, deviceAspect(device, mediaAspect, stylePad(frameStyle)))

  const layer = sceneLayer(scene.kind)
  const sceneEl = layer && (
    <div
      className="layer"
      style={{
        background: layer.background,
        filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        opacity: scene.opacity / 100,
      }}
    />
  )
  const sceneBack = layer && !layer.front ? sceneEl : null
  const sceneFront = layer?.front ? sceneEl : null

  return (
    <div className="stage-area" ref={areaRef}>
      <div style={{ width: width * fit, height: height * fit }}>
        {/* The transform and the transparency checkerboard live on this wrapper so the exported node stays clean. */}
        <div
          className={background.kind === 'transparent' ? 'checker' : undefined}
          style={{ width, height, transform: `scale(${fit})`, transformOrigin: '0 0' }}
        >
          <div ref={stageRef} className="stage" style={{ width, height }}>
            <div
              className="layer"
              style={{
                background: backgroundCss(background),
                ...(background.kind === 'image' && background.blur
                  ? { filter: `blur(${background.blur}px)`, transform: 'scale(1.1)' }
                  : {}),
              }}
            />
            {sceneBack}
            <div style={{ transform: rotationCss(rotation) }}>
              <DeviceFrame
                device={device}
                width={size.width}
                height={size.height}
                radius={radius}
                shadow={shadowCss(shadow.mode, shadow.opacity)}
                frameStyle={frameStyle}
              >
                {mediaUrl ? (
                  <img src={mediaUrl} alt="Mockup media" className="media" />
                ) : (
                  <div className="placeholder">Drop, paste or choose an image</div>
                )}
              </DeviceFrame>
            </div>
            {sceneFront}
            {watermark.text && (
              <div
                className={`watermark ${watermark.position}`}
                style={{ opacity: watermark.opacity / 100, fontSize: width * 0.022 }}
              >
                {watermark.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
