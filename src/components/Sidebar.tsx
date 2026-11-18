import { useRef } from 'react'
import { GRADIENT_PRESETS, RADIUS_PRESETS, RATIOS, type RatioId, type ShadowMode } from '../domain/scene'
import { useEditor } from '../state/editorStore'

export function Sidebar() {
  const s = useEditor()
  const fileRef = useRef<HTMLInputElement>(null)
  const bg = s.background

  return (
    <aside className="sidebar">
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
          <input type="range" min={0} max={120} value={s.radius} onChange={(e) => s.set({ radius: +e.target.value })} />
        </label>
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
        <div className="row">
          <button className={bg.kind === 'transparent' ? 'on' : ''} onClick={() => s.set({ background: { kind: 'transparent' } })}>
            Transparent
          </button>
          <button
            className={bg.kind === 'solid' ? 'on' : ''}
            onClick={() => s.set({ background: { kind: 'solid', color: '#1e1e1e' } })}
          >
            Solid
          </button>
          <button
            className={bg.kind === 'gradient' ? 'on' : ''}
            onClick={() =>
              s.set({ background: { kind: 'gradient', from: GRADIENT_PRESETS[0][0], to: GRADIENT_PRESETS[0][1], angle: 135 } })
            }
          >
            Gradient
          </button>
        </div>

        {bg.kind === 'solid' && (
          <input type="color" value={bg.color} onChange={(e) => s.set({ background: { ...bg, color: e.target.value } })} />
        )}

        {bg.kind === 'gradient' && (
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
              <input type="color" value={bg.from} onChange={(e) => s.set({ background: { ...bg, from: e.target.value } })} />
              <input type="color" value={bg.to} onChange={(e) => s.set({ background: { ...bg, to: e.target.value } })} />
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
    </aside>
  )
}
