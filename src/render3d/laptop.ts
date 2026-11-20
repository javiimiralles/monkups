import {
  CanvasTexture,
  CircleGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  NoColorSpace,
  SRGBColorSpace,
  type Texture,
} from 'three'
import { deviceColors, type DeviceColor, type Vec3 } from './angles'
import { blackGlass, disposeTree, flatPanel, roundedSlab, screenGlass, showScreen, type DeviceMesh } from './shapes'

/** Laptop dimensions in millimetres (a 14" aluminium unibody laptop). */
export const LAPTOP = {
  w: 312.6,
  d: 221.2,
  baseH: 10.5,
  r: 9,
  edge: 2.2,
  lidH: 214,
  lidT: 4.6,
  /** How far the open lid leans back from vertical, in radians. */
  lean: (16 * Math.PI) / 180,
}

const SCREEN_W = LAPTOP.w - 14
const SCREEN_H = SCREEN_W / 1.54
const PIVOT = { y: LAPTOP.baseH + 1.2, z: -LAPTOP.d / 2 + 3.4 }

/** Corners of the base and the open lid; base bottom at y = 0, keyboard facing +Y, screen facing +Z. */
export function laptopBounds(): Vec3[] {
  const { w, d, baseH, lidH, lidT, lean } = LAPTOP
  const pts: Vec3[] = []
  const c = Math.cos(-lean)
  const s = Math.sin(-lean)
  for (const x of [-w / 2, w / 2]) {
    for (const y of [0, baseH]) for (const z of [-d / 2, d / 2]) pts.push([x, y, z])
    for (const y of [0, lidH])
      for (const z of [-lidT, 0]) pts.push([x, PIVOT.y + y * c - z * s, PIVOT.z + y * s + z * c])
  }
  return pts
}

const PX_PER_MM = 5
type Layer = 'color' | 'pbr' | 'bump'

/**
 * Paints the top deck (keyboard, trackpad, speaker grilles) in millimetres, once per layer:
 * colour, packed roughness (G) / metalness (B), and a bump height map.
 */
function paintDeck(g: CanvasRenderingContext2D, dw: number, dd: number, layer: Layer, color: DeviceColor) {
  const c = deviceColors(color)
  const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`
  const pick = (colour: string, pbr: string, bump: string) =>
    layer === 'color' ? colour : layer === 'pbr' ? pbr : bump
  const rect = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    g.beginPath()
    g.roundRect(x, y, w, h, r)
    g.fillStyle = fill
    g.fill()
  }

  g.setTransform(PX_PER_MM, 0, 0, PX_PER_MM, 0, 0)
  g.fillStyle = pick(hex(c.body), 'rgb(0,90,255)', '#808080')
  g.fillRect(0, 0, dw, dd)

  const u = 18.4
  const gap = 1.7
  const kbW = 14.5 * u
  const x0 = (dw - kbW) / 2
  const y0 = 8
  const rows: [number, number[], string[]][] = [
    [10.5, Array(14).fill(14.5 / 14), []],
    [u, [...Array(13).fill(1), 1.5], [...'`1234567890-='.split(''), '']],
    [u, [1.5, ...Array(12).fill(1), 1], ['', ...'QWERTYUIOP[]'.split(''), '\\']],
    [u, [1.8, ...Array(11).fill(1), 1.7], ['', ...'ASDFGHJKL;\''.split(''), '']],
    [u, [2.3, ...Array(10).fill(1), 2.2], ['', ...'ZXCVBNM,./'.split(''), '']],
    [u, [1, 1, 1, 1.25, 5, 1.25, 1], []],
  ]
  const key = (x: number, y: number, w: number, h: number, label = '') => {
    rect(x - 0.5, y - 0.5, w + 1, h + 1, 2, pick('rgba(0,0,0,0.38)', 'rgb(0,150,0)', '#585858'))
    rect(x, y, w, h, 1.6, pick(hex(c.keys), 'rgb(0,185,0)', '#ffffff'))
    if (layer === 'color' && label) {
      g.fillStyle = 'rgba(214,216,220,0.82)'
      g.font = '500 3.3px sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(label, x + w / 2, y + h / 2)
    }
  }
  let y = y0
  for (const [h, widths, labels] of rows) {
    let x = x0
    widths.forEach((wu, i) => {
      key(x + gap / 2, y + gap / 2, wu * u - gap, h - gap, labels[i])
      x += wu * u
    })
    if (h === u && widths.length === 7) {
      // Inverted-T arrows: half-height left/right, stacked up/down.
      const half = (h - gap) / 2 - gap / 4
      key(x + gap / 2, y + h / 2 + gap / 4, u - gap, half)
      key(x + u + gap / 2, y + gap / 2, u - gap, half)
      key(x + u + gap / 2, y + h / 2 + gap / 4, u - gap, half)
      key(x + 2 * u + gap / 2, y + h / 2 + gap / 4, u - gap, half)
    }
    y += h
  }
  const kbBottom = y

  // Speaker grilles either side of the keyboard.
  g.fillStyle = pick('rgba(0,0,0,0.5)', 'rgb(0,160,0)', '#5a5a5a')
  for (const gx of [x0 - 15, x0 + kbW + 4])
    for (let py = y0 + 1; py < kbBottom - 1; py += 1.6)
      for (let px = gx; px < gx + 11; px += 1.6) {
        g.beginPath()
        g.arc(px, py, 0.36, 0, Math.PI * 2)
        g.fill()
      }

  // Trackpad: a slightly brighter, smoother glass-like inset with a hairline edge.
  const tw = 152
  const th = Math.min(96, dd - kbBottom - 18)
  const tx = (dw - tw) / 2
  const ty = dd - 9 - th
  rect(tx - 0.45, ty - 0.45, tw + 0.9, th + 0.9, 4.2, pick('rgba(0,0,0,0.22)', 'rgb(0,90,255)', '#606060'))
  rect(tx, ty, tw, th, 4, pick(color === 'silver' ? '#dcdee2' : '#414246', 'rgb(0,70,120)', '#7c7c7c'))
}

function deckTexture(dw: number, dd: number, layer: Layer, color: DeviceColor) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(dw * PX_PER_MM)
  canvas.height = Math.round(dd * PX_PER_MM)
  paintDeck(canvas.getContext('2d')!, dw, dd, layer, color)
  const tex = new CanvasTexture(canvas)
  tex.flipY = false
  tex.anisotropy = 8
  tex.colorSpace = layer === 'color' ? SRGBColorSpace : NoColorSpace
  return tex
}

export function buildLaptop(): DeviceMesh {
  const { w, d, baseH, r, edge, lidH, lidT, lean } = LAPTOP
  const group = new Group()
  const dw = w - 2 * edge
  const dd = d - 2 * edge

  const alu = new MeshPhysicalMaterial({ metalness: 1, roughness: 0.36 })
  const hingeMat = new MeshPhysicalMaterial({ metalness: 0.9, roughness: 0.45 })
  const glass = blackGlass()
  const screen = screenGlass()
  const deckColor = deckTexture(dw, dd, 'color', 'silver')
  const deckPbr = deckTexture(dw, dd, 'pbr', 'silver')
  const deckBump = deckTexture(dw, dd, 'bump', 'silver')
  const deck = new MeshPhysicalMaterial({
    map: deckColor,
    roughnessMap: deckPbr,
    metalnessMap: deckPbr,
    bumpMap: deckBump,
    bumpScale: 0.6,
  })

  const base = new Mesh(roundedSlab(w, d, r, baseH, edge).rotateX(-Math.PI / 2), alu)
  group.add(base)
  const top = new Mesh(flatPanel(dw, dd, r - edge).rotateX(-Math.PI / 2), deck)
  top.position.y = baseH + 0.01
  group.add(top)

  const hinge = new Mesh(new CylinderGeometry(3.2, 3.2, w - 2 * r - 40, 32).rotateZ(Math.PI / 2), hingeMat)
  hinge.position.set(0, PIVOT.y - 1, PIVOT.z + 0.6)
  group.add(hinge)

  // The lid is built upright from its bottom edge, screen towards +Z, then leaned back on the hinge.
  const lid = new Group()
  lid.position.set(0, PIVOT.y, PIVOT.z)
  lid.rotation.x = -lean
  const shell = new Mesh(roundedSlab(w, lidH, r, lidT, 1.3), alu)
  shell.position.set(0, lidH / 2, -lidT)
  const bezel = new Mesh(flatPanel(w - 3.4, lidH - 3.4, r - 1.7), glass)
  bezel.position.set(0, lidH / 2, 0.02)
  const panel = new Mesh(flatPanel(SCREEN_W, SCREEN_H, 1.2), screen)
  panel.position.set(0, lidH - 7 - SCREEN_H / 2, 0.04)
  const cam = new Mesh(new CircleGeometry(1.1, 24), new MeshPhysicalMaterial({ color: 0x0c1220, roughness: 0.1 }))
  cam.position.set(0, lidH - 3.6, 0.05)
  lid.add(shell, bezel, panel, cam)
  group.add(lid)

  let current: Texture | null = null
  let painted: DeviceColor = 'silver'
  return {
    group,
    screenAspect: SCREEN_W / SCREEN_H,
    setColor(color: DeviceColor) {
      const c = deviceColors(color)
      alu.color.setHex(c.body)
      hingeMat.color.setHex(c.hinge)
      if (color === painted) return
      painted = color
      for (const [tex, layer] of [
        [deckColor, 'color'],
        [deckPbr, 'pbr'],
        [deckBump, 'bump'],
      ] as const) {
        paintDeck((tex.image as HTMLCanvasElement).getContext('2d')!, dw, dd, layer, color)
        tex.needsUpdate = true
      }
    },
    setScreen(tex) {
      current = tex
      showScreen(screen, tex, SCREEN_W / SCREEN_H)
    },
    dispose: () => disposeTree(group, current),
  }
}
