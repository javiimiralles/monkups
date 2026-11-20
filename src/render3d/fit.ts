import { Matrix4, PerspectiveCamera, Vector3 } from 'three'
import { cameraPose, type AnglePreset, type DeviceModel } from './angles'
import { laptopBounds } from './laptop'
import { phoneBounds } from './phone'

export interface Framing {
  /** Device rotation around X (the phone lies flat for the top view). */
  tilt: number
  /** Height of the surface the device rests on, after tilting. */
  floorY: number
  /** Floor area the contact shadow covers: [minX, maxX, minZ, maxZ]. */
  footprint: [number, number, number, number]
  /** Square-aspect camera looking at the device. */
  camera: PerspectiveCamera
  /** Region of the camera's NDC square that holds the device and its shadow. */
  region: { minX: number; maxX: number; minY: number; maxY: number }
  /** Width / height of that region: the aspect the canvas should have to frame the device tightly. */
  aspect: number
}

const PADDING = 0.04

export function framing(model: DeviceModel, angle: AnglePreset): Framing {
  const pose = cameraPose(model, angle)
  const tiltM = new Matrix4().makeRotationX(pose.tilt)
  const pts = (model === 'phone' ? phoneBounds() : laptopBounds()).map((p) => new Vector3(...p).applyMatrix4(tiltM))

  const min = new Vector3(Infinity, Infinity, Infinity)
  const max = new Vector3(-Infinity, -Infinity, -Infinity)
  for (const p of pts) {
    min.min(p)
    max.max(p)
  }
  // The soft shadow spreads a little beyond the device on the floor.
  const spread = 0.1 * Math.max(max.x - min.x, max.z - min.z)
  const footprint: Framing['footprint'] = [min.x - spread, max.x + spread, min.z - spread, max.z + spread]
  for (const x of footprint.slice(0, 2)) for (const z of footprint.slice(2)) pts.push(new Vector3(x, min.y, z))

  const center = new Vector3()
  for (const p of pts) center.add(p)
  center.divideScalar(pts.length)
  const radius = Math.max(...pts.map((p) => p.distanceTo(center)))

  const camera = new PerspectiveCamera(pose.fov, 1, 1, 10_000)
  const dist = (radius / Math.sin(((pose.fov / 2) * Math.PI) / 180)) * 1.05
  camera.position.copy(center).addScaledVector(new Vector3(...pose.direction), dist)
  camera.near = Math.max(dist - radius * 1.5, 1)
  camera.far = dist + radius * 1.5
  camera.lookAt(center)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()

  const region = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const p of pts) {
    const q = p.clone().project(camera)
    region.minX = Math.min(region.minX, q.x)
    region.maxX = Math.max(region.maxX, q.x)
    region.minY = Math.min(region.minY, q.y)
    region.maxY = Math.max(region.maxY, q.y)
  }
  const padX = (region.maxX - region.minX) * PADDING
  const padY = (region.maxY - region.minY) * PADDING
  region.minX -= padX
  region.maxX += padX
  region.minY -= padY
  region.maxY += padY

  return {
    tilt: pose.tilt,
    floorY: min.y,
    footprint,
    camera,
    region,
    aspect: (region.maxX - region.minX) / (region.maxY - region.minY),
  }
}

/** Width / height of the device (with its shadow) as seen from `angle`, so a layout can size the canvas. */
export const projectedAspect = (model: DeviceModel, angle: AnglePreset) => framing(model, angle).aspect

/**
 * Crops `f.camera` to the device region, widened to `canvasAspect` so nothing is stretched,
 * and copies the result into `target`.
 */
export function applyFraming(target: PerspectiveCamera, f: Framing, canvasAspect: number) {
  let { minX, maxX, minY, maxY } = f.region
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  let w = maxX - minX
  let h = maxY - minY
  if (w / h < canvasAspect) w = h * canvasAspect
  else h = w / canvasAspect
  minX = cx - w / 2
  maxY = cy + h / 2
  target.copy(f.camera)
  const full = 10_000
  // NDC [-1, 1] maps to [0, full] pixels, y downwards.
  target.setViewOffset(full, full, ((minX + 1) / 2) * full, ((1 - maxY) / 2) * full, (w / 2) * full, (h / 2) * full)
}
