import { forwardRef, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { deviceAspect, getDevice } from '../domain/devices'
import { PADDING, layoutScreens, placeScreen, type Rect } from '../domain/layout'
import { backgroundCss, frameSize, sceneLayer, shadowCss } from '../domain/scene'
import { IDENTITY, ZOOM_PRESETS, poseAt, poseCss } from '../domain/animation'
import { rotationCss, stylePad } from '../domain/styles'
import { MAX_SCREENS, useEditor } from '../state/editorStore'
import { DeviceFrame } from './DeviceFrame'

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    screens,
    media,
    selectedScreen,
    layout,
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
    setScreen,
    set,
  } = useEditor()
  // The animation pose moves the whole composition; the static rotation tilts each screen.
  const pose = playhead === null ? IDENTITY : poseAt(animation.preset, playhead)
  // The focus only pivots zoom presets; otherwise transforms keep their centered pivot.
  const zoomed = ZOOM_PRESETS.includes(animation.preset)
  const focus = zoomed ? `${animation.focus.x}% ${animation.focus.y}%` : undefined
  const { width, height } = frameSize(ratio)
  const stage = { width, height }
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

  const single = screens.length === 1
  // CSS padding percentages resolve against the width on every side.
  const pad = PADDING * width
  const innerAspect = (width - 2 * pad) / (height - 2 * pad)
  const aspects = screens.map((s) => {
    const device = getDevice(s.deviceId)
    const size = media[s.id]?.size
    // An empty lone screenshot fills the stage, as the one-device editor did; empty screens in a set stay uniform.
    const fallback = device.kind === 'screenshot' && single ? innerAspect : 16 / 10
    return deviceAspect(device, size ? size.width / size.height : fallback, stylePad(frameStyle))
  })
  const rects = layoutScreens(layout.preset, layout.gap, stage, aspects).map((slot, i) =>
    placeScreen(slot, screens[i], stage),
  )
  // The pose wrapper hugs the composition, so the zoom focus is a percentage of what is shown.
  const group = bounds(rects)

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
  const hasMedia = Object.keys(media).length > 0

  return (
    <div className="stage-area" ref={areaRef}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addScreens([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      {/* The mat, the empty-state prompt and the selection layer sit outside the exported stage node. */}
      <div className="mat" style={{ width: width * fit, height: height * fit }}>
        {hasMedia ? (
          <button
            className="replace"
            disabled={screens.length >= MAX_SCREENS && !!media[selectedScreen]}
            onClick={() => fileRef.current?.click()}
          >
            Add screens
          </button>
        ) : (
          <button className="empty" onClick={() => fileRef.current?.click()}>
            <strong>Add screenshots</strong>
            <span>Up to {MAX_SCREENS}. Paste with Ctrl+V, drop them here, or click to choose</span>
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
              style={{
                position: 'absolute',
                left: group.x,
                top: group.y,
                width: group.width,
                height: group.height,
                transform: poseCss(pose),
                transformOrigin: focus,
              }}
            >
              {screens.map((s, i) => (
                <div
                  key={s.id}
                  style={{
                    position: 'absolute',
                    left: rects[i].x - group.x,
                    top: rects[i].y - group.y,
                    transform: rotationCss(rotation),
                    // A lone screen keeps pivoting on the zoom focus, so one-device designs render as before.
                    transformOrigin: single ? focus : undefined,
                  }}
                >
                  <DeviceFrame
                    device={getDevice(s.deviceId)}
                    width={rects[i].width}
                    height={rects[i].height}
                    radius={radius}
                    shadow={shadowCss(shadow.mode, shadow.opacity)}
                    frameStyle={frameStyle}
                  >
                    {media[s.id] ? (
                      <img src={media[s.id].url} alt={`Screen ${i + 1}`} className="media" />
                    ) : (
                      <div className="placeholder" />
                    )}
                  </DeviceFrame>
                </div>
              ))}
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
        {hasMedia && playhead === null && (
          <SelectionLayer
            fit={fit}
            items={screens.map((s, i) => ({
              id: s.id,
              label: `Screen ${i + 1}`,
              rect: rects[i],
              selected: s.id === selectedScreen,
              onSelect: () => set({ selectedScreen: s.id }),
              // A drag moves the screen off its layout slot; the preset stays the base.
              onMove: (ddx, ddy) => setScreen(s.id, { dx: s.dx + (ddx / width) * 100, dy: s.dy + (ddy / height) * 100 }),
            }))}
          />
        )}
      </div>
    </div>
  )
})

function bounds(rects: Rect[]): Rect {
  const x = Math.min(...rects.map((r) => r.x))
  const y = Math.min(...rects.map((r) => r.y))
  const right = Math.max(...rects.map((r) => r.x + r.width))
  const bottom = Math.max(...rects.map((r) => r.y + r.height))
  return { x, y, width: right - x, height: bottom - y }
}

/** Something on the stage that can be selected and dragged; rects are in stage pixels. */
export type SelectionItem = {
  id: string
  label: string
  rect: Rect
  selected: boolean
  onSelect: () => void
  /** Called once when a drag ends, with the total movement in stage pixels. */
  onMove: (dx: number, dy: number) => void
}

/**
 * Editor-only hit boxes and selection outlines, drawn over the stage in mat pixels.
 * It is a sibling of the exported node, so exports and thumbnails never include it.
 */
function SelectionLayer({ items, fit }: { items: SelectionItem[]; fit: number }) {
  return (
    <div className="selection-layer">
      {items.map((item) => (
        <SelectionBox key={item.id} item={item} fit={fit} />
      ))}
    </div>
  )
}

function SelectionBox({ item, fit }: { item: SelectionItem; fit: number }) {
  const drag = useRef<{ x: number; y: number } | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const { rect } = item

  const end = (e: ReactPointerEvent) => {
    if (!drag.current) return
    const dx = (e.clientX - drag.current.x) / fit
    const dy = (e.clientY - drag.current.y) / fit
    drag.current = null
    setOffset({ x: 0, y: 0 })
    if (dx || dy) item.onMove(dx, dy)
  }

  return (
    <button
      type="button"
      aria-label={item.label}
      aria-pressed={item.selected}
      className={`selection-box${item.selected ? ' on' : ''}`}
      style={{
        left: rect.x * fit,
        top: rect.y * fit,
        width: rect.width * fit,
        height: rect.height * fit,
        transform: offset.x || offset.y ? `translate(${offset.x}px, ${offset.y}px)` : undefined,
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return
        item.onSelect()
        drag.current = { x: e.clientX, y: e.clientY }
        e.currentTarget.setPointerCapture(e.pointerId)
      }}
      onPointerMove={(e) => {
        if (drag.current) setOffset({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y })
      }}
      onPointerUp={end}
      onPointerCancel={end}
    />
  )
}
