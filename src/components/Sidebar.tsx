import { useEffect, useRef, useState } from 'react'
import { DEVICE_GROUPS, DEVICES, getDevice } from '../domain/devices'
import {
  GRADIENT_PRESETS,
  RADIUS_PRESETS,
  RATIOS,
  SCENES,
  type RatioId,
  type ShadowMode,
  type WatermarkPosition,
} from '../domain/scene'
import { FRAME_STYLES, type Rotation } from '../domain/styles'
import { useEditor } from '../state/editorStore'
import { UnsplashPicker } from './UnsplashPicker'

export function Sidebar() {
  const s = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)
  const bgFileRef = useRef<HTMLInputElement>(null)
  // The Image tab can be open before an image is chosen, so the background keeps its previous value meanwhile.
  const [imageTab, setImageTab] = useState(s.background.kind === 'image')
  // Follow background changes made elsewhere (templates, opened projects).
  useEffect(() => setImageTab(s.background.kind === 'image'), [s.background.kind])
  const bg = s.background
  const { kind } = getDevice(s.deviceId)
  const hasRadius = kind === 'screenshot' || kind === 'browser'
  const rotate = (axis: keyof Rotation, value: number) => s.set({ rotation: { ...s.rotation, [axis]: value } })

  return (
    <aside className="sidebar">
      <section>
        <h3>Device</h3>
        <select value={s.deviceId} onChange={(e) => s.set({ deviceId: e.target.value })}>
          {DEVICE_GROUPS.map((group) => (
            <optgroup key={group.kind} label={group.label}>
              {DEVICES.filter((d) => d.kind === group.kind).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </section>

      <section>
        <h3>Media</h3>
        <button className="drop" onClick={() => fileRef.current?.click()}>
          Drop media or click to choose
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && s.setMedia(e.target.files[0])}
        />
      </section>

      <section>
        <h3>Frame</h3>
        <select value={s.ratio} onChange={(e) => s.set({ ratio: e.target.value as RatioId })}>
          {RATIOS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </section>

      {/* Hardware frames have fixed corners and body; radius and style only apply to screenshots and browser windows. */}
      {hasRadius && (
        <section>
          <h3>Style</h3>
          <div className="styles">
            {FRAME_STYLES.map((st) => (
              <button
                key={st.id}
                className={s.frameStyle === st.id ? 'on' : ''}
                onClick={() => s.set({ frameStyle: st.id })}
              >
                {st.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {hasRadius && (
        <section>
          <h3>Border</h3>
          <div className="row">
            {Object.entries(RADIUS_PRESETS).map(([name, value]) => (
              <button key={name} className={s.radius === value ? 'on' : ''} onClick={() => s.set({ radius: value })}>
                {name}
              </button>
            ))}
          </div>
          <label>
            Radius {s.radius}
            <input
              type="range"
              min={0}
              max={120}
              value={s.radius}
              onChange={(e) => s.set({ radius: +e.target.value })}
            />
          </label>
        </section>
      )}

      <section>
        <h3>Rotation</h3>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <label key={axis}>
            {axis.toUpperCase()} {s.rotation[axis]}°
            <input
              type="range"
              min={axis === 'z' ? -180 : -60}
              max={axis === 'z' ? 180 : 60}
              value={s.rotation[axis]}
              onChange={(e) => rotate(axis, +e.target.value)}
            />
          </label>
        ))}
        <button onClick={() => s.set({ rotation: { x: 0, y: 0, z: 0 } })}>Reset rotation</button>
      </section>

      <section>
        <h3>Shadow</h3>
        <div className="row">
          {(['none', 'spread', 'hug'] as ShadowMode[]).map((mode) => (
            <button
              key={mode}
              className={s.shadow.mode === mode ? 'on' : ''}
              onClick={() => s.set({ shadow: { ...s.shadow, mode } })}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <label>
          Opacity {s.shadow.opacity}
          <input
            type="range"
            min={0}
            max={100}
            value={s.shadow.opacity}
            onChange={(e) => s.set({ shadow: { ...s.shadow, opacity: +e.target.value } })}
          />
        </label>
      </section>

      <section>
        <h3>Background</h3>
        <div className="styles">
          {(
            [
              ['Transparent', { kind: 'transparent' }],
              ['Solid', { kind: 'solid', color: '#1e1e1e' }],
              ['Gradient', { kind: 'gradient', from: GRADIENT_PRESETS[0][0], to: GRADIENT_PRESETS[0][1], angle: 135 }],
            ] as const
          ).map(([label, value]) => (
            <button
              key={label}
              className={!imageTab && bg.kind === value.kind ? 'on' : ''}
              onClick={() => {
                setImageTab(false)
                s.set({ background: { ...value } })
              }}
            >
              {label}
            </button>
          ))}
          <button className={imageTab ? 'on' : ''} onClick={() => setImageTab(true)}>
            Image
          </button>
        </div>

        {imageTab && (
          <>
            <button className="drop" style={{ height: 48, marginTop: 8 }} onClick={() => bgFileRef.current?.click()}>
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
                <label>
                  Blur {bg.blur}
                  <input
                    type="range"
                    min={0}
                    max={60}
                    value={bg.blur}
                    onChange={(e) => s.set({ background: { ...bg, blur: +e.target.value } })}
                  />
                </label>
                {bg.credit && (
                  <p className="credit">
                    Photo by{' '}
                    <a href={bg.credit.link} target="_blank" rel="noreferrer">
                      {bg.credit.name}
                    </a>{' '}
                    on Unsplash
                  </p>
                )}
              </>
            )}
            <UnsplashPicker
              onPick={(p) => s.set({ background: { kind: 'image', url: p.url, blur: 0, credit: p.credit } })}
            />
          </>
        )}

        {!imageTab && bg.kind === 'solid' && (
          <input
            type="color"
            value={bg.color}
            onChange={(e) => s.set({ background: { ...bg, color: e.target.value } })}
          />
        )}

        {!imageTab && bg.kind === 'gradient' && (
          <>
            <div className="swatches">
              {GRADIENT_PRESETS.map(([from, to]) => (
                <button
                  key={from + to}
                  aria-label={`Gradient ${from} to ${to}`}
                  className="swatch"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  onClick={() => s.set({ background: { ...bg, from, to } })}
                />
              ))}
            </div>
            <div className="row">
              <input
                type="color"
                value={bg.from}
                onChange={(e) => s.set({ background: { ...bg, from: e.target.value } })}
              />
              <input
                type="color"
                value={bg.to}
                onChange={(e) => s.set({ background: { ...bg, to: e.target.value } })}
              />
            </div>
            <label>
              Angle {bg.angle}°
              <input
                type="range"
                min={0}
                max={360}
                value={bg.angle}
                onChange={(e) => s.set({ background: { ...bg, angle: +e.target.value } })}
              />
            </label>
          </>
        )}
      </section>

      <section>
        <h3>Scene</h3>
        <div className="styles">
          {SCENES.map((sc) => (
            <button
              key={sc.id}
              className={s.scene.kind === sc.id ? 'on' : ''}
              onClick={() => s.set({ scene: { ...s.scene, kind: sc.id } })}
            >
              {sc.label}
            </button>
          ))}
        </div>
        {s.scene.kind !== 'none' && (
          <label>
            Intensity {s.scene.opacity}
            <input
              type="range"
              min={0}
              max={100}
              value={s.scene.opacity}
              onChange={(e) => s.set({ scene: { ...s.scene, opacity: +e.target.value } })}
            />
          </label>
        )}
      </section>

      <section>
        <h3>Watermark</h3>
        <input
          type="text"
          placeholder="Watermark text"
          value={s.watermark.text}
          onChange={(e) => s.set({ watermark: { ...s.watermark, text: e.target.value } })}
        />
        {s.watermark.text && (
          <>
            <select
              style={{ marginTop: 8 }}
              value={s.watermark.position}
              onChange={(e) => s.set({ watermark: { ...s.watermark, position: e.target.value as WatermarkPosition } })}
            >
              <option value="bottom-right">Bottom right</option>
              <option value="bottom-left">Bottom left</option>
              <option value="top-right">Top right</option>
              <option value="top-left">Top left</option>
            </select>
            <label>
              Opacity {s.watermark.opacity}
              <input
                type="range"
                min={10}
                max={100}
                value={s.watermark.opacity}
                onChange={(e) => s.set({ watermark: { ...s.watermark, opacity: +e.target.value } })}
              />
            </label>
          </>
        )}
      </section>
    </aside>
  )
}
