import {
  ACESFilmicToneMapping,
  BackSide,
  BufferAttribute,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  MeshPhysicalMaterial,
  SphereGeometry,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js'
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js'
import type { AnglePreset, DeviceColor, DeviceModel } from './angles'
import { applyFraming, framing, type Framing } from './fit'
import { buildLaptop } from './laptop'
import { buildPhone } from './phone'
import { disposeTree, type DeviceMesh } from './shapes'

export { projectedAspect } from './fit'
export type { AnglePreset, DeviceColor, DeviceModel } from './angles'

export interface RenderOptions {
  model: DeviceModel
  angle: AnglePreset
  color: DeviceColor
  /**
   * Decoded screenshot. Not a 2D canvas: GPU-accelerated canvases above ~2048 px upload as black
   * in Chrome/ANGLE (measured in the T1 spike), while images and blob-decoded ImageBitmaps work.
   */
  screen: HTMLImageElement | ImageBitmap | null
  /** CSS pixel size of the canvas; the caller sizes the canvas element itself. */
  width: number
  height: number
  pixelRatio: number
}

export interface DeviceRenderer {
  /** Draws one frame synchronously. */
  render(opts: RenderOptions): void
  dispose(): void
}

/**
 * Soft contact shadow in the style of three.js' contact-shadow example: the device is rendered from
 * below as depth-based darkness into a small target, blurred twice, and shown on a floor plane.
 */
function contactShadow(renderer: WebGLRenderer) {
  const SIZE = 512
  const target = new WebGLRenderTarget(SIZE, SIZE)
  const blurTarget = new WebGLRenderTarget(SIZE, SIZE)
  target.texture.generateMipmaps = blurTarget.texture.generateMipmaps = false

  const group = new Group()
  const plane = new Mesh(
    new PlaneGeometry(1, 1).rotateX(Math.PI / 2),
    new MeshBasicMaterial({ map: target.texture, transparent: true, depthWrite: false, opacity: 0.8 }),
  )
  plane.renderOrder = 1
  plane.scale.y = -1
  const blurPlane = new Mesh(new PlaneGeometry(1, 1).rotateX(Math.PI / 2))
  blurPlane.visible = false
  const cam = new OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1)
  cam.rotation.x = Math.PI / 2
  group.add(plane, blurPlane, cam)

  const depth = new MeshDepthMaterial({ depthTest: false, depthWrite: false })
  depth.userData.darkness = { value: 1.25 }
  depth.onBeforeCompile = (shader) => {
    shader.uniforms.darkness = depth.userData.darkness
    shader.fragmentShader = `uniform float darkness;\n${shader.fragmentShader.replace(
      'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
      'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );',
    )}`
  }
  const hBlur = new ShaderMaterial({ ...HorizontalBlurShader, uniforms: { tDiffuse: { value: null }, h: { value: 0 } } })
  const vBlur = new ShaderMaterial({ ...VerticalBlurShader, uniforms: { tDiffuse: { value: null }, v: { value: 0 } } })
  hBlur.depthTest = vBlur.depthTest = false

  const blur = (amount: number) => {
    blurPlane.visible = true
    blurPlane.material = hBlur
    hBlur.uniforms.tDiffuse.value = target.texture
    hBlur.uniforms.h.value = amount / SIZE
    renderer.setRenderTarget(blurTarget)
    renderer.render(blurPlane, cam)
    blurPlane.material = vBlur
    vBlur.uniforms.tDiffuse.value = blurTarget.texture
    vBlur.uniforms.v.value = amount / SIZE
    renderer.setRenderTarget(target)
    renderer.render(blurPlane, cam)
    blurPlane.visible = false
  }

  return {
    group,
    /** Re-renders the shadow of `scene` for the device framed by `f` (whose height above the floor is `height`). */
    update(scene: Scene, f: Framing, height: number) {
      const [x0, x1, z0, z1] = f.footprint
      const w = x1 - x0
      const d = z1 - z0
      group.position.set((x0 + x1) / 2, f.floorY, (z0 + z1) / 2)
      // Cameras ignore parent scale, so the planes are scaled and the camera frustum is set in world units.
      plane.scale.set(w, -1, d)
      blurPlane.scale.set(w, 1, d)
      cam.left = -w / 2
      cam.right = w / 2
      cam.top = d / 2
      cam.bottom = -d / 2
      cam.far = height
      cam.updateProjectionMatrix()
      group.updateMatrixWorld(true)

      const clearAlpha = renderer.getClearAlpha()
      plane.visible = false
      scene.overrideMaterial = depth
      renderer.setClearAlpha(0)
      renderer.setRenderTarget(target)
      renderer.render(scene, cam)
      scene.overrideMaterial = null
      blur(7)
      blur(2.5)
      renderer.setRenderTarget(null)
      renderer.setClearAlpha(clearAlpha)
      plane.visible = true
    },
    dispose() {
      target.dispose()
      blurTarget.dispose()
      plane.geometry.dispose()
      ;(plane.material as MeshBasicMaterial).dispose()
      blurPlane.geometry.dispose()
      depth.dispose()
      hBlur.dispose()
      vBlur.dispose()
    },
  }
}

/** A dim gradient dome with one soft box up-left: what the screen glass reflects. */
function screenStudio() {
  const scene = new Scene()
  const dome = new SphereGeometry(50, 32, 16)
  const pos = dome.attributes.position
  const colors = new Float32Array(pos.count * 3)
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 50
    colors.fill(t > 0 ? 0.05 + 0.25 * t : 0.05 + 0.04 * t, i * 3, i * 3 + 3)
  }
  dome.setAttribute('color', new BufferAttribute(colors, 3))
  scene.add(new Mesh(dome, new MeshBasicMaterial({ side: BackSide, vertexColors: true })))
  const box = new Mesh(new PlaneGeometry(44, 22), new MeshBasicMaterial({ color: new Color(2.6, 2.6, 2.6) }))
  box.position.set(-22, 26, 30)
  box.lookAt(0, 0, 0)
  scene.add(box)
  return scene
}

export function createDeviceRenderer(
  canvas: HTMLCanvasElement,
  // Keeps the last frame readable after compositing, so DOM rasterizers can copy the canvas later.
  { preserveDrawingBuffer = true } = {},
): DeviceRenderer {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 0.95
  renderer.outputColorSpace = SRGBColorSpace

  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const env = pmrem.fromScene(room, 0.04).texture
  const studio = screenStudio()
  const screenEnv = pmrem.fromScene(studio, 0.02).texture
  room.dispose()
  disposeTree(studio)
  pmrem.dispose()
  scene.environment = env

  const shadow = contactShadow(renderer)
  scene.add(shadow.group)
  const camera = new PerspectiveCamera()

  const devices: Partial<Record<DeviceModel, { mesh: DeviceMesh; source: RenderOptions['screen']; tex: Texture | null }>> =
    {}
  let shadowKey = ''

  const device = (model: DeviceModel) => {
    let d = devices[model]
    if (!d) {
      d = { mesh: model === 'phone' ? buildPhone() : buildLaptop(), source: null, tex: null }
      devices[model] = d
      // Screens and glass reflect a dim studio instead of the room's bright lights, which would wash out the untone-mapped screenshot.
      d.mesh.group.traverse((o) => {
        const m = (o as Mesh).material as MeshPhysicalMaterial | undefined
        if (m?.name === 'screen' || m?.name === 'glass') m.envMap = screenEnv
      })
      scene.add(d.mesh.group)
    }
    return d
  }

  return {
    render(opts) {
      const d = device(opts.model)
      for (const [model, other] of Object.entries(devices)) other!.mesh.group.visible = model === opts.model

      if (d.source !== opts.screen) {
        d.tex?.dispose()
        d.source = opts.screen
        d.tex = opts.screen ? new Texture(opts.screen) : null
        if (d.tex) {
          d.tex.colorSpace = SRGBColorSpace
          d.tex.flipY = false
          d.tex.anisotropy = 8
          d.tex.needsUpdate = true
        }
        d.mesh.setScreen(d.tex)
      }

      const f = framing(opts.model, opts.angle)
      d.mesh.group.rotation.x = f.tilt
      d.mesh.setColor(opts.color)

      const key = `${opts.model}|${opts.angle}|${opts.color}`
      if (key !== shadowKey) {
        shadowKey = key
        d.mesh.group.updateMatrixWorld(true)
        shadow.update(scene, f, opts.model === 'phone' && f.tilt === 0 ? 40 : 60)
      }

      const size = renderer.getSize(new Vector2())
      if (renderer.getPixelRatio() !== opts.pixelRatio || size.x !== opts.width || size.y !== opts.height) {
        renderer.setPixelRatio(opts.pixelRatio)
        renderer.setSize(opts.width, opts.height, false)
      }
      applyFraming(camera, f, opts.width / opts.height)
      renderer.setRenderTarget(null)
      renderer.render(scene, camera)
    },
    dispose() {
      for (const d of Object.values(devices)) {
        d!.mesh.dispose()
        d!.tex?.dispose()
      }
      shadow.dispose()
      env.dispose()
      screenEnv.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
