import { forwardRef, useEffect, useRef, useState } from 'react'
import { deviceAspect, fitBox, getDevice } from '../domain/devices'
import { backgroundCss, frameSize, sceneLayer, shadowCss } from '../domain/scene'
import { IDENTITY, ZOOM_PRESETS, poseAt, poseCss } from '../domain/animation'
import { stylePad } from '../domain/styles'
import { useEditor } from '../state/editorStore'
import { DeviceFrame } from './DeviceFrame'

const PADDING = 0.08

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    screens,
    media,
    ratio,
    radius,
    frameStyle,
    rotation,
    shadow,
    background,
    scene,
    watermark,
    animation,
    playhead,
    addScreens,
  } = useEditor()
  // ponytail: only the first screen renders until the multi-screen stage lands in the next commit.
  const mediaUrl = media[screens[0].id]?.url
  const mediaSize = media[screens[0].id]?.size
  const deviceId = screens[0].deviceId
  // The animation pose adds to the static design rotation; with no playhead the design is shown as-is.
  const pose = playhead === null ? IDENTITY : poseAt(animation.preset, playhead)
  // The focus only pivots zoom presets; otherwise the static rotation keeps its centered pivot.
  const zoomed = ZOOM_PRESETS.includes(animation.preset)
  const transform = poseCss({ ...pose, rx: pose.rx + rotation.x, ry: pose.ry + rotation.y, rz: pose.rz + rotation.z })
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
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          addScreens([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      {/* The mat and the empty-state prompt sit outside the exported stage node. */}
      <div className="mat" style={{ width: width * fit, height: height * fit }}>
        {mediaUrl ? (
          <button className="replace" onClick={() => fileRef.current?.click()}>
            Replace image
          </button>
        ) : (
          <button className="empty" onClick={() => fileRef.current?.click()}>
            <strong>Add a screenshot</strong>
            <span>Paste with Ctrl+V, drop it here, or click to choose</span>
          </button>
        )}
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
            <div
              style={{ transform, transformOrigin: zoomed ? `${animation.focus.x}% ${animation.focus.y}%` : undefined }}
            >
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
                  <div className="placeholder" />
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
