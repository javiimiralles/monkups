import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { deviceAspect, getDevice } from '../domain/devices'
import { PADDING, layoutScreens, placeScreen, type Rect } from '../domain/layout'
import { backgroundCss, frameSize, sceneLayer, shadowCss } from '../domain/scene'
import { IDENTITY, ZOOM_PRESETS, poseAt, poseCss } from '../domain/animation'
import { fontFamily, overlayPx, type Overlay } from '../domain/overlays'
import { rotationCss, stylePad } from '../domain/styles'
import { MAX_SCREENS, selectedScreenId, useEditor } from '../state/editorStore'
import { Device3D } from './Device3D'
import { DeviceFrame } from './DeviceFrame'

/** Renders the scene at full export resolution, scaled down to fit the viewport. */
export const Stage = forwardRef<HTMLDivElement>(function Stage(_, stageRef) {
  const fileRef = useRef<HTMLInputElement>(null)
  const {
    screens,
    media,
    selection,
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
    overlays,
    editing,
    addScreens,
    setScreen,
    setOverlay,
    startEditing,
    commitEditing,
    cancelEditing,
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
    return deviceAspect(device, size ? size.width / size.height : fallback, stylePad(frameStyle), s.angle)
  })
  const rects = layoutScreens(layout.preset, layout.gap, stage, aspects).map((slot, i) =>
    placeScreen(slot, screens[i], stage),
  )
  // The pose wrapper hugs the composition, so the zoom focus is a percentage of what is shown.
  const group = bounds(rects)

  // Realistic devices take their angle from the 3D camera, so the static rotation leaves them upright.
  const realistic = screens.map((s) => getDevice(s.deviceId).kind === '3d')
  const tilt = (i: number) => {
    const r = realistic[i] ? { x: 0, y: 0, z: 0 } : rotation
    return { x: pose.rx + r.x, y: pose.ry + r.y, z: pose.rz + r.z }
  }

  const frame = (i: number) => {
    const s = screens[i]
    const device = getDevice(s.deviceId)
    if (device.kind === '3d')
      return (
        <Device3D
          model={device.model!}
          angle={s.angle}
          color={s.color}
          src={media[s.id]?.url}
          width={rects[i].width}
          height={rects[i].height}
        />
      )
    return (
      <DeviceFrame
        device={device}
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
    )
  }

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

  // Text and button heights come from their content, so the selection boxes measure the rendered overlays.
  const overlayLayer = useRef<HTMLDivElement>(null)
  const [boxes, setBoxes] = useState<Record<string, Rect>>({})
  const measure = () => {
    const next: Record<string, Rect> = {}
    overlayLayer.current?.querySelectorAll<HTMLElement>('[data-overlay]').forEach((el) => {
      next[el.dataset.overlay!] = { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
    })
    setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }
  useLayoutEffect(measure)
  // Fonts load after the first paint and change text sizes without a render.
  useEffect(() => {
    const layer = overlayLayer.current
    if (!layer) return
    const observer = new ResizeObserver(measure)
    layer.querySelectorAll('[data-overlay]').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [overlays])

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
            disabled={screens.length >= MAX_SCREENS && !!media[selectedScreenId(selection) ?? '']}
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
          // Clicking empty stage clears the selection; clicking inside the text being edited does not.
          onPointerDown={(e) => {
            if (!(e.target as HTMLElement).isContentEditable) set({ selection: null })
          }}
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
            {single ? (
              // A lone screen keeps the one-device structure: flex-centred, one transform summing pose and rotation.
              <div
                style={{
                  left: rects[0].x - (width - rects[0].width) / 2,
                  top: rects[0].y - (height - rects[0].height) / 2,
                  transform: poseCss({ ...pose, rx: tilt(0).x, ry: tilt(0).y, rz: tilt(0).z }),
                  transformOrigin: focus,
                }}
              >
                {frame(0)}
              </div>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  left: group.x,
                  top: group.y,
                  width: group.width,
                  height: group.height,
                  transform: poseCss({ ...pose, rx: 0, ry: 0, rz: 0 }),
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
                      // Nested perspective rotations do not compose, so the pose angles join the static rotation here.
                      transform: rotationCss(tilt(i)),
                    }}
                  >
                    {frame(i)}
                  </div>
                ))}
              </div>
            )}
            {sceneFront}
            {/* Overlays sit above the screens and outside the pose wrapper, so animations leave them still. */}
            {overlays.length > 0 && (
              <div className="layer" ref={overlayLayer}>
                {overlays.map((o) => (
                  <OverlayView
                    key={o.id}
                    overlay={o}
                    stage={stage}
                    editing={editing === o.id}
                    onCommit={(text) => commitEditing(o.id, text)}
                    onCancel={cancelEditing}
                  />
                ))}
              </div>
            )}
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
        {(hasMedia || overlays.length > 0) && playhead === null && (
          <SelectionLayer
            fit={fit}
            items={[
              ...(hasMedia ? screens : []).map(
                (s, i): SelectionItem => ({
                  id: s.id,
                  label: `Screen ${i + 1}`,
                  rect: rects[i],
                  selected: s.id === selectedScreenId(selection),
                  onSelect: () => set({ selection: { kind: 'screen', id: s.id } }),
                  // A drag moves the screen off its layout slot; the preset stays the base.
                  onMove: (ddx, ddy) => setScreen(s.id, { dx: s.dx + (ddx / width) * 100, dy: s.dy + (ddy / height) * 100 }),
                }),
              ),
              // The overlay being edited takes the pointer itself, so its box steps aside.
              ...overlays.flatMap((o): SelectionItem[] => {
                const box = boxes[o.id]
                if (!box || editing === o.id) return []
                return [
                  {
                    id: o.id,
                    label: o.kind === 'logo' ? 'Logo' : o.text || 'Empty text',
                    rect: box,
                    rotation: o.rotation,
                    placeholder: o.kind !== 'logo' && !o.text ? 'Type something' : undefined,
                    selected: selection?.id === o.id,
                    onSelect: () => set({ selection: { kind: 'overlay', id: o.id } }),
                    onMove: (ddx, ddy) => setOverlay(o.id, { x: o.x + (ddx / width) * 100, y: o.y + (ddy / height) * 100 }),
                    onResize: (dw, proportional) => {
                      const factor = Math.max(0.1, (box.width + dw) / box.width)
                      // A button is sized by its text; Shift scales a text block's type with its width.
                      if (o.kind === 'button') return setOverlay(o.id, { size: Math.max(0.5, o.size * factor) })
                      const next = Math.max(2, o.width * factor)
                      setOverlay(o.id, o.kind === 'text' && proportional ? { width: next, size: o.size * factor } : { width: next })
                    },
                    onEdit: o.kind === 'logo' ? undefined : () => startEditing(o.id),
                  },
                ]
              }),
            ]}
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
  /** Degrees around the centre, matching the element under the box. */
  rotation?: number
  /** Editor-only hint drawn in the box, such as for an empty text. */
  placeholder?: string
  /** Called once when the corner handle is released, with the width change in stage pixels. */
  onResize?: (dw: number, proportional: boolean) => void
  onEdit?: () => void
}

type TextLike = Exclude<Overlay, { kind: 'logo' }>

const textCss = (o: TextLike, fontSize: number | undefined): CSSProperties => ({
  fontFamily: fontFamily(o.font),
  fontSize,
  fontWeight: o.weight,
  fontStyle: o.italic ? 'italic' : 'normal',
  color: o.color,
  textAlign: o.align,
  lineHeight: o.lineHeight,
  letterSpacing: `${o.letterSpacing}em`,
  textTransform: o.uppercase ? 'uppercase' : 'none',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'break-word',
})

/** One overlay inside the exported stage; while edited, its text becomes editable in place. */
function OverlayView({
  overlay: o,
  stage,
  editing,
  onCommit,
  onCancel,
}: {
  overlay: Overlay
  stage: { width: number; height: number }
  editing: boolean
  onCommit: (text: string) => void
  onCancel: () => void
}) {
  const px = overlayPx(o, stage)
  const base: CSSProperties = {
    position: 'absolute',
    left: px.left,
    top: px.top,
    opacity: o.opacity / 100,
    transform: o.rotation ? `rotate(${o.rotation}deg)` : undefined,
  }
  if (o.kind === 'logo') {
    const style = { ...base, width: px.width, height: px.height }
    // A logo whose image was lost keeps its place without a broken-image icon.
    return o.src ? <img data-overlay={o.id} src={o.src} alt="" style={style} /> : <div data-overlay={o.id} style={style} />
  }
  const box: CSSProperties =
    o.kind === 'text'
      ? { width: px.width }
      : {
          width: 'max-content',
          maxWidth: px.width,
          background: o.fill,
          borderRadius: `${o.radius}em`,
          padding: `${o.padY}em ${o.padX}em`,
          border: o.border ? `${o.border}em solid ${o.color}` : undefined,
        }
  return (
    // An empty text keeps one line of height so it can still be selected.
    <div data-overlay={o.id} style={{ ...base, ...textCss(o, px.fontSize), ...box, minHeight: `${o.lineHeight}em` }}>
      {editing ? <EditableText text={o.text} onCommit={onCommit} onCancel={onCancel} /> : o.text}
    </div>
  )
}

/** Plain-text editing in place: commits on blur (a click outside), Escape restores the text. */
function EditableText({ text, onCommit, onCancel }: { text: string; onCommit: (text: string) => void; onCancel: () => void }) {
  const ref = useRef<HTMLSpanElement>(null)
  // Runs once on mount; React renders no children here, so typing never fights reconciliation.
  useLayoutEffect(() => {
    const el = ref.current!
    el.textContent = text
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    getSelection()?.removeAllRanges()
    getSelection()?.addRange(range)
  }, [])
  return (
    <span
      ref={ref}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      // Raw text while editing: innerText of uppercase-styled text would save it uppercased.
      style={{ textTransform: 'none', pointerEvents: 'auto', outline: 'none' }}
      // Chrome reports a trailing line break for the caret placeholder of a last empty line.
      onBlur={(e) => onCommit(e.currentTarget.innerText.replace(/\n$/, ''))}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Escape') {
          e.preventDefault()
          onCancel()
        }
      }}
    />
  )
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
  const resize = useRef<number | null>(null)
  const [grow, setGrow] = useState(0)
  const { rect } = item

  const endResize = (e: ReactPointerEvent) => {
    if (resize.current === null) return
    const dw = (e.clientX - resize.current) / fit
    resize.current = null
    setGrow(0)
    if (dw) item.onResize?.(dw, e.shiftKey)
  }
  const transform = [
    offset.x || offset.y ? `translate(${offset.x}px, ${offset.y}px)` : '',
    item.rotation ? `rotate(${item.rotation}deg)` : '',
  ].join(' ')

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
        // The resize preview keeps the box aspect.
        width: rect.width * fit + grow,
        height: rect.height * fit * (1 + grow / (rect.width * fit)),
        transform: transform.trim() || undefined,
      }}
      onDoubleClick={item.onEdit}
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
    >
      {item.placeholder && <span className="selection-placeholder">{item.placeholder}</span>}
      {item.selected && item.onResize && (
        <span
          className="resize-handle"
          aria-hidden="true"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.stopPropagation()
            resize.current = e.clientX
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (resize.current !== null) setGrow(e.clientX - resize.current)
          }}
          onPointerUp={endResize}
          onPointerCancel={endResize}
        />
      )}
    </button>
  )
}
