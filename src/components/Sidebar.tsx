import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ANIMATION_PRESETS, ZOOM_PRESETS } from '../domain/animation'
import { DEVICE_GROUPS, DEVICES, getDevice } from '../domain/devices'
import {
  GRADIENT_PRESETS,
  RADIUS_PRESETS,
  RATIOS,
  SCENES,
  backgroundCss,
  type ShadowMode,
  type WatermarkPosition,
} from '../domain/scene'
import { FRAME_STYLES, type Rotation } from '../domain/styles'
import { MAX_SCREENS, useEditor } from '../state/editorStore'
import { LAYOUT_PRESETS } from '../domain/layout'
import {
  DevicePreview,
  FillPreview,
  RadiusPreview,
  RatioPreview,
  ScenePreview,
  ShadowPreview,
  StylePreview,
} from './Previews'
import { UnsplashPicker } from './UnsplashPicker'

type Tab = 'frame' | 'background' | 'extras'
const TABS: [Tab, string][] = [
  ['frame', 'Frame'],
  ['background', 'Background'],
  ['extras', 'Extras'],
]

type Option<T> = { value: T; label: string; title?: string; preview?: ReactNode }

/** A row of mutually exclusive buttons; every option stays visible so the layout never shifts. */
function Choice<T>({
  options,
  value,
  onChange,
  disabled,
  cols,
}: {
  options: Option<T>[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  cols?: number
}) {
  return (
    <div
      className={`choice${options.some((o) => o.preview) ? ' tiles' : ''}`}
      style={cols ? { gridTemplateColumns: `repeat(${cols}, 1fr)` } : undefined}
    >
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          title={o.title}
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.preview}
          <span className="caption">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

function Range({
  label,
  value,
  unit = '',
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  label: string
  value: number
  unit?: string
  min: number
  max: number
  step?: number
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <label className="range">
      <span className="range-head">
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  )
}

function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="group">
      <h3>
        {title}
        {note && <small>{note}</small>}
      </h3>
      {children}
    </section>
  )
}

export function Sidebar() {
  const [tab, setTab] = useState<Tab>('frame')
  return (
    <aside className="inspector" aria-label="Design settings">
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls="inspector-panel"
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="panel" id="inspector-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'frame' && <FramePanel />}
        {tab === 'background' && <BackgroundPanel />}
        {tab === 'extras' && <ExtrasPanel />}
      </div>
    </aside>
  )
}

/** The screenshots on the canvas: pick one to edit, add more, replace, remove or reorder. */
function ScreensGroup() {
  const s = useEditor()
  const addRef = useRef<HTMLInputElement>(null)
  const replaceRef = useRef<HTMLInputElement>(null)
  const index = s.screens.findIndex((sc) => sc.id === s.selectedScreen)
  const selected = s.screens[index]
  const full = s.screens.length >= MAX_SCREENS

  return (
    <Group title="Screens" note={`${s.screens.length} of ${MAX_SCREENS}`}>
      <div className="screens" role="group" aria-label="Screens">
        {s.screens.map((sc, i) => (
          <button
            key={sc.id}
            aria-label={`Screen ${i + 1}`}
            aria-pressed={sc.id === s.selectedScreen}
            onClick={() => s.set({ selectedScreen: sc.id })}
          >
            {s.media[sc.id] ? <img src={s.media[sc.id].url} alt="" /> : 'Empty'}
          </button>
        ))}
      </div>
      <div className="row-actions">
        <button disabled={full} title={full ? `Up to ${MAX_SCREENS} screens` : undefined} onClick={() => addRef.current?.click()}>
          Add
        </button>
        <button disabled={!selected} onClick={() => replaceRef.current?.click()}>
          {selected && s.media[selected.id] ? 'Replace' : 'Choose image'}
        </button>
        <button
          aria-label="Move left"
          disabled={index <= 0}
          onClick={() => s.moveScreen(s.selectedScreen, -1)}
        >
          ←
        </button>
        <button
          aria-label="Move right"
          disabled={index < 0 || index >= s.screens.length - 1}
          onClick={() => s.moveScreen(s.selectedScreen, 1)}
        >
          →
        </button>
        <button
          className="danger"
          disabled={!selected || (s.screens.length === 1 && !s.media[selected.id])}
          onClick={() => s.removeScreen(s.selectedScreen)}
        >
          Remove
        </button>
      </div>
      <input
        ref={addRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          s.addScreens([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) s.replaceScreenMedia(s.selectedScreen, e.target.files[0])
          e.target.value = ''
        }}
      />
    </Group>
  )
}

function FramePanel() {
  const s = useEditor()
  const screen = s.screens.find((sc) => sc.id === s.selectedScreen) ?? s.screens[0]
  const setDevice = (deviceId: string) => s.setScreen(screen.id, { deviceId })
  const device = getDevice(screen.deviceId)
  const models = DEVICES.filter((d) => d.kind === device.kind)
  // Hardware frames have fixed corners and body; radius and style only apply to screenshots and browser windows.
  const hardware = device.kind !== 'screenshot' && device.kind !== 'browser'
  const rotate = (axis: keyof Rotation, value: number) => s.set({ rotation: { ...s.rotation, [axis]: value } })
  const rotated = s.rotation.x !== 0 || s.rotation.y !== 0 || s.rotation.z !== 0

  const many = s.screens.length > 1
  const index = s.screens.indexOf(screen)

  return (
    <>
      <ScreensGroup />

      <Group title="Device" note={many ? `Screen ${index + 1}` : undefined}>
        <Choice
          cols={3}
          value={device.kind}
          options={DEVICE_GROUPS.map((g) => ({
            value: g.kind,
            label: g.label,
            preview: <DevicePreview device={DEVICES.find((d) => d.kind === g.kind)!} />,
          }))}
          onChange={(kind) => setDevice(DEVICES.find((d) => d.kind === kind)!.id)}
        />
        {models.length > 1 && (
          <select aria-label="Model" value={screen.deviceId} onChange={(e) => setDevice(e.target.value)}>
            {models.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        )}
        {many && (
          <button
            className="link"
            disabled={s.screens.every((sc) => sc.deviceId === screen.deviceId)}
            onClick={() => s.set({ screens: s.screens.map((sc) => ({ ...sc, deviceId: screen.deviceId })) })}
          >
            Apply to all screens
          </button>
        )}
      </Group>

      <Group title="Layout">
        <Choice
          value={s.layout.preset}
          disabled={!many}
          options={LAYOUT_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
          onChange={(preset) => s.set({ layout: { ...s.layout, preset } })}
        />
        <Range
          label="Gap"
          unit="%"
          disabled={!many || s.layout.preset === 'cascade'}
          value={s.layout.gap}
          min={0}
          max={12}
          step={0.5}
          onChange={(gap) => s.set({ layout: { ...s.layout, gap } })}
        />
        <Range
          label={many ? `Size of screen ${index + 1}` : 'Size'}
          unit="%"
          value={Math.round(screen.scale * 100)}
          min={30}
          max={200}
          onChange={(v) => s.setScreen(screen.id, { scale: v / 100 })}
        />
        <button
          className="link"
          disabled={!screen.dx && !screen.dy && screen.scale === 1}
          onClick={() => s.setScreen(screen.id, { dx: 0, dy: 0, scale: 1 })}
        >
          Reset position and size
        </button>
      </Group>

      <Group title="Aspect ratio">
        <Choice
          cols={5}
          value={s.ratio}
          options={RATIOS.map((r) => ({ value: r.id, label: r.id, title: r.label, preview: <RatioPreview ratio={r.id} /> }))}
          onChange={(ratio) => s.set({ ratio })}
        />
      </Group>

      <Group title="Style" note={hardware ? 'Fixed by the device' : undefined}>
        <Choice
          cols={3}
          disabled={hardware}
          value={s.frameStyle}
          options={FRAME_STYLES.map((st) => ({ value: st.id, label: st.label, preview: <StylePreview id={st.id} /> }))}
          onChange={(frameStyle) => s.set({ frameStyle })}
        />
        <Choice
          disabled={hardware}
          value={s.radius}
          options={Object.entries(RADIUS_PRESETS).map(([name, value]) => ({
            value,
            label: name,
            preview: <RadiusPreview radius={value} />,
          }))}
          onChange={(radius) => s.set({ radius })}
        />
        <Range
          label="Corner radius"
          disabled={hardware}
          value={s.radius}
          min={0}
          max={120}
          onChange={(radius) => s.set({ radius })}
        />
      </Group>

      <Group title="Shadow">
        <Choice<ShadowMode>
          value={s.shadow.mode}
          options={(['none', 'spread', 'hug'] as const).map((mode) => ({
            value: mode,
            label: mode[0].toUpperCase() + mode.slice(1),
            preview: <ShadowPreview mode={mode} />,
          }))}
          onChange={(mode) => s.set({ shadow: { ...s.shadow, mode } })}
        />
        <Range
          label="Opacity"
          disabled={s.shadow.mode === 'none'}
          value={s.shadow.opacity}
          min={0}
          max={100}
          onChange={(opacity) => s.set({ shadow: { ...s.shadow, opacity } })}
        />
      </Group>

      <Group title="Rotation">
        {(['x', 'y', 'z'] as const).map((axis) => (
          <Range
            key={axis}
            label={`Tilt ${axis.toUpperCase()}`}
            unit="°"
            value={s.rotation[axis]}
            min={axis === 'z' ? -180 : -60}
            max={axis === 'z' ? 180 : 60}
            onChange={(v) => rotate(axis, v)}
          />
        ))}
        <button className="link" disabled={!rotated} onClick={() => s.set({ rotation: { x: 0, y: 0, z: 0 } })}>
          Reset rotation
        </button>
      </Group>
    </>
  )
}

function BackgroundPanel() {
  const s = useEditor()
  const bg = s.background
  const bgFileRef = useRef<HTMLInputElement>(null)
  // The Image tab can be open before an image is chosen, so the background keeps its previous value meanwhile.
  const [imageTab, setImageTab] = useState(bg.kind === 'image')
  // Follow background changes made elsewhere (templates, opened projects).
  useEffect(() => setImageTab(bg.kind === 'image'), [bg.kind])

  const kinds = {
    transparent: { kind: 'transparent' },
    solid: { kind: 'solid', color: '#1e1e1e' },
    gradient: { kind: 'gradient', from: GRADIENT_PRESETS[0][0], to: GRADIENT_PRESETS[0][1], angle: 135 },
  } as const

  return (
    <>
      <Group title="Fill">
        <Choice<keyof typeof kinds | 'image'>
          cols={4}
          value={imageTab ? 'image' : bg.kind}
          options={[
            { value: 'transparent', label: 'None', preview: <FillPreview background={kinds.transparent} /> },
            {
              value: 'solid',
              label: 'Solid',
              preview: <FillPreview background={bg.kind === 'solid' ? bg : kinds.solid} />,
            },
            {
              value: 'gradient',
              label: 'Gradient',
              preview: <FillPreview background={bg.kind === 'gradient' ? bg : kinds.gradient} />,
            },
            {
              value: 'image',
              label: 'Image',
              preview: bg.kind === 'image' ? <FillPreview background={bg} /> : <span className="thumb thumb-photo" aria-hidden="true" />,
            },
          ]}
          onChange={(kind) => {
            if (kind === 'image') return setImageTab(true)
            setImageTab(false)
            s.set({ background: { ...kinds[kind] } })
          }}
        />

        {!imageTab && bg.kind === 'solid' && (
          <label className="color">
            Color
            <input
              type="color"
              value={bg.color}
              onChange={(e) => s.set({ background: { ...bg, color: e.target.value } })}
            />
          </label>
        )}

        {!imageTab && bg.kind === 'gradient' && (
          <>
            <div className="swatches">
              {GRADIENT_PRESETS.map(([from, to]) => (
                <button
                  key={from + to}
                  aria-label={`Gradient ${from} to ${to}`}
                  aria-pressed={bg.from === from && bg.to === to}
                  className="swatch"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  onClick={() => s.set({ background: { ...bg, from, to } })}
                />
              ))}
            </div>
            <div className="pair">
              <label className="color">
                From
                <input
                  type="color"
                  value={bg.from}
                  onChange={(e) => s.set({ background: { ...bg, from: e.target.value } })}
                />
              </label>
              <label className="color">
                To
                <input
                  type="color"
                  value={bg.to}
                  onChange={(e) => s.set({ background: { ...bg, to: e.target.value } })}
                />
              </label>
            </div>
            <Range
              label="Angle"
              unit="°"
              value={bg.angle}
              min={0}
              max={360}
              onChange={(angle) => s.set({ background: { ...bg, angle } })}
            />
          </>
        )}

        {imageTab && (
          <>
            <button className="upload" onClick={() => bgFileRef.current?.click()}>
              Upload background image
            </button>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && s.setBackgroundImage(e.target.files[0])}
            />
            {bg.kind === 'image' && (
              <>
                <Range
                  label="Blur"
                  value={bg.blur}
                  min={0}
                  max={60}
                  onChange={(blur) => s.set({ background: { ...bg, blur } })}
                />
                {bg.credit && (
                  <p className="hint">
                    Photo by{' '}
                    <a href={bg.credit.link} target="_blank" rel="noreferrer">
                      {bg.credit.name}
                    </a>{' '}
                    on Unsplash
                  </p>
                )}
              </>
            )}
          </>
        )}
      </Group>

      {imageTab && (
        <Group title="Unsplash">
          <UnsplashPicker
            onPick={(p) => s.set({ background: { kind: 'image', url: p.url, blur: 0, credit: p.credit } })}
          />
        </Group>
      )}

      <Group title="Scene">
        <Choice
          cols={3}
          value={s.scene.kind}
          options={SCENES.map((sc) => ({
            value: sc.id,
            label: sc.label,
            preview: <ScenePreview kind={sc.id} background={backgroundCss(bg)} />,
          }))}
          onChange={(kind) => s.set({ scene: { ...s.scene, kind } })}
        />
        <Range
          label="Intensity"
          disabled={s.scene.kind === 'none'}
          value={s.scene.opacity}
          min={0}
          max={100}
          onChange={(opacity) => s.set({ scene: { ...s.scene, opacity } })}
        />
      </Group>
    </>
  )
}

function ExtrasPanel() {
  const s = useEditor()
  const wm = s.watermark
  const anim = s.animation
  const noWatermark = !wm.text

  return (
    <>
      <Group title="Watermark">
        <input
          type="text"
          aria-label="Watermark text"
          placeholder="Text, e.g. yoursite.com"
          value={wm.text}
          onChange={(e) => s.set({ watermark: { ...wm, text: e.target.value } })}
        />
        <select
          aria-label="Watermark position"
          disabled={noWatermark}
          value={wm.position}
          onChange={(e) => s.set({ watermark: { ...wm, position: e.target.value as WatermarkPosition } })}
        >
          <option value="bottom-right">Bottom right</option>
          <option value="bottom-left">Bottom left</option>
          <option value="top-right">Top right</option>
          <option value="top-left">Top left</option>
        </select>
        <Range
          label="Opacity"
          disabled={noWatermark}
          value={wm.opacity}
          min={10}
          max={100}
          onChange={(opacity) => s.set({ watermark: { ...wm, opacity } })}
        />
      </Group>

      <Group title="Animation" note="Enables video export">
        <Choice
          cols={3}
          value={anim.preset}
          options={ANIMATION_PRESETS.map((a) => ({ value: a.id, label: a.label }))}
          onChange={(preset) => s.set({ animation: { ...anim, preset } })}
        />
        <Range
          label="Duration"
          unit="s"
          disabled={anim.preset === 'none'}
          value={anim.duration}
          min={2}
          max={10}
          step={0.5}
          onChange={(duration) => s.set({ animation: { ...anim, duration } })}
        />
        {(['x', 'y'] as const).map((axis) => (
          <Range
            key={axis}
            label={`Zoom focus ${axis.toUpperCase()}`}
            unit="%"
            disabled={!ZOOM_PRESETS.includes(anim.preset)}
            value={anim.focus[axis]}
            min={0}
            max={100}
            onChange={(v) => s.set({ animation: { ...anim, focus: { ...anim.focus, [axis]: v } } })}
          />
        ))}
      </Group>
    </>
  )
}
