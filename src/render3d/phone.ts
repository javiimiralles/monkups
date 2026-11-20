import { CircleGeometry, CylinderGeometry, Group, Mesh, MeshPhysicalMaterial, type Texture } from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { deviceColors, type DeviceColor, type Vec3 } from './angles'
import { blackGlass, disposeTree, flatPanel, roundedSlab, screenGlass, showScreen, type DeviceMesh } from './shapes'

/** Phone dimensions in millimetres (a modern 6.1" flat-edged phone). */
export const PHONE = { w: 71.6, h: 147.6, d: 7.9, r: 11.5, edge: 1.5, bezel: 2.4, island: 1.6 }

const GLASS_TOP = PHONE.d / 2 + 0.35

/** Corners of the phone's bounding box, centred on the origin, screen facing +Z. */
export function phoneBounds(): Vec3[] {
  const { w, h, d, island } = PHONE
  const pts: Vec3[] = []
  for (const x of [-w / 2, w / 2])
    for (const y of [-h / 2, h / 2]) for (const z of [-d / 2 - island - 0.6, GLASS_TOP]) pts.push([x, y, z])
  return pts
}

export function buildPhone(): DeviceMesh {
  const { w, h, d, r, edge, bezel } = PHONE
  const group = new Group()

  const frame = new MeshPhysicalMaterial({ metalness: 1, roughness: 0.24 })
  const back = new MeshPhysicalMaterial({ metalness: 0, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 })
  const glass = blackGlass()
  const screen = screenGlass()

  const body = new Mesh(roundedSlab(w, h, r, d, edge), frame)
  body.position.z = -d / 2
  group.add(body)

  // Front glass sits proud of the frame, leaving a thin metal rim.
  const front = new Mesh(roundedSlab(w - 1.4, h - 1.4, r - 0.7, 0.9, 0.35), glass)
  front.position.z = GLASS_TOP - 0.9
  group.add(front)

  const sw = w - 1.4 - 2 * bezel
  const sh = h - 1.4 - 2 * bezel
  const panel = new Mesh(flatPanel(sw, sh, r - 0.7 - bezel), screen)
  panel.position.z = GLASS_TOP + 0.005
  group.add(panel)

  const pill = new Mesh(flatPanel(19.5, 5.6, 2.8), glass)
  pill.position.set(0, sh / 2 - 5.2, GLASS_TOP + 0.01)
  group.add(pill)

  const backPanel = new Mesh(flatPanel(w - 2 * edge, h - 2 * edge, r - edge), back)
  backPanel.rotation.y = Math.PI
  backPanel.position.z = -d / 2 - 0.01
  group.add(backPanel)

  // Camera island on the back, top-left when seen from behind.
  const camera = new Group()
  camera.position.set(w / 2 - 4.5 - 16, h / 2 - 4.5 - 16, -d / 2)
  camera.rotation.y = Math.PI
  const plate = new Mesh(roundedSlab(32, 32, 8.5, PHONE.island, 0.6), back)
  plate.position.z = -0.2
  camera.add(plate)
  const ring = new CylinderGeometry(5.6, 5.6, 1.6, 48).rotateX(Math.PI / 2)
  const lens = new CircleGeometry(4.3, 48)
  for (const [x, y] of [
    [-7, 7],
    [-7, -7],
    [7.5, 0],
  ]) {
    const barrel = new Mesh(ring, frame)
    barrel.position.set(x, y, PHONE.island - 0.2)
    const eye = new Mesh(lens, glass)
    eye.position.set(x, y, PHONE.island + 0.61)
    camera.add(barrel, eye)
  }
  group.add(camera)

  // Side buttons: action and volume on the left, power on the right.
  for (const [side, y, len] of [
    [-1, 42, 6.5],
    [-1, 27, 11],
    [-1, 13, 11],
    [1, 24, 17],
  ]) {
    const button = new Mesh(new RoundedBoxGeometry(1.6, len, 3, 3, 0.6), frame)
    button.position.set(side * (w / 2 - 0.3), y, 0)
    group.add(button)
  }

  let current: Texture | null = null
  return {
    group,
    screenAspect: sw / sh,
    setColor(color: DeviceColor) {
      const c = deviceColors(color)
      frame.color.setHex(c.body)
      back.color.setHex(c.back)
    },
    setScreen(tex) {
      current = tex
      showScreen(screen, tex, sw / sh)
    },
    dispose: () => disposeTree(group, current),
  }
}
