import {
  BufferAttribute,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  Object3D,
  Shape,
  ShapeGeometry,
  Texture,
} from 'three'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { coverFit, type DeviceColor } from './angles'

/** A procedural device ready to add to a scene. */
export interface DeviceMesh {
  group: Group
  /** Width / height of the screen panel. */
  screenAspect: number
  setColor(color: DeviceColor): void
  /** Shows `tex` on the screen (cover fit), or a dark screen for null. The caller owns `tex`. */
  setScreen(tex: Texture | null): void
  dispose(): void
}

/** Glossy black glass for bezels and lenses. */
export const blackGlass = () =>
  new MeshPhysicalMaterial({ name: 'glass', color: 0x030304, metalness: 0, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02 })

/**
 * Screen surface: the screenshot is emitted unlit and without tone mapping so its colours stay exact,
 * while the clearcoat adds the glass reflections on top.
 */
export const screenGlass = () =>
  new MeshPhysicalMaterial({
    name: 'screen',
    color: 0x000000,
    emissive: 0x000000,
    roughness: 0.5,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    envMapIntensity: 1,
    toneMapped: false,
  })

/** Points `screen` at `tex` (cover fit to `aspect`), or turns it off for null. */
export function showScreen(screen: MeshPhysicalMaterial, tex: Texture | null, aspect: number) {
  if (tex) fitScreen(tex, aspect)
  screen.emissiveMap = tex
  screen.emissive.setHex(tex ? 0xffffff : 0x000000)
  screen.needsUpdate = true
}

/** Disposes every geometry and material (and their textures) under `root`, except `keep`. */
export function disposeTree(root: Object3D, keep?: Texture | null) {
  root.traverse((o) => {
    const mesh = o as Mesh
    if (!mesh.isMesh) return
    mesh.geometry.dispose()
    for (const m of [mesh.material].flat()) {
      for (const v of Object.values(m)) if (v instanceof Texture && v !== keep) v.dispose()
      m.dispose()
    }
  })
}

/** Rounded rectangle centred on the origin. */
export function roundRect(w: number, h: number, r: number) {
  const s = new Shape()
  const x = -w / 2
  const y = -h / 2
  s.moveTo(x + r, y)
  s.lineTo(x + w - r, y)
  s.quadraticCurveTo(x + w, y, x + w, y + r)
  s.lineTo(x + w, y + h - r)
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  s.lineTo(x + r, y + h)
  s.quadraticCurveTo(x, y + h, x, y + h - r)
  s.lineTo(x, y + r)
  s.quadraticCurveTo(x, y, x + r, y)
  return s
}

/**
 * Flat rounded rectangle whose UVs span 0..1 across it with v = 0 at the top edge, matching
 * textures uploaded with `flipY = false` (the only orientation ImageBitmap supports).
 */
export function flatPanel(w: number, h: number, r: number) {
  const g = new ShapeGeometry(roundRect(w, h, r), 24)
  const pos = g.attributes.position
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5
    uv[i * 2 + 1] = 0.5 - pos.getY(i) / h
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  return g
}

/**
 * Rounded slab of exact outer size `w` x `h` x `depth`, with rounded edges of radius `edge`,
 * extruded along +Z from 0 to `depth`.
 */
export function roundedSlab(w: number, h: number, r: number, depth: number, edge: number) {
  const g = new ExtrudeGeometry(roundRect(w - 2 * edge, h - 2 * edge, Math.max(r - edge, 0.01)), {
    depth: depth - 2 * edge,
    bevelEnabled: true,
    bevelThickness: edge,
    bevelSize: edge,
    bevelSegments: 6,
    curveSegments: 16,
  })
  g.translate(0, 0, edge)
  // Extrusions come out non-indexed (faceted); weld vertices so the bevels shade smoothly.
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  const smooth = mergeVertices(g, 1e-3)
  smooth.computeVertexNormals()
  g.dispose()
  return smooth
}

/** Fits a screen texture to a screen of `aspect` like CSS `object-fit: cover`. */
export function fitScreen(tex: Texture, aspect: number) {
  const img = tex.image as { width: number; height: number }
  const { repeat, offset } = coverFit(img.width / img.height, aspect)
  tex.repeat.set(repeat[0], repeat[1])
  tex.offset.set(offset[0], offset[1])
}
