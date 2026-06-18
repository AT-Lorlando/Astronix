<script setup lang="ts">
import * as THREE from 'three'

// Max number of asteroids attracting stars at once (pool size, also the shader loop bound).
const MAX_ASTEROIDS = 8

// Green spiral galaxy adapted from the reference easter.vue, recolored to the
// site's single green accent, textured with /public/dot.png, tuned to sit behind
// the page content, with a mouse-repel interaction.
const galaxy = {
  count: 7000,
  radius: 4,
  branches: 3,
  spin: 1.0,
  randomness: 0.5,
  randomnessPower: 3,
  insideColor: '#b9ffe3', // bright mint core (near --primary)
  outsideColor: '#0c5c43', // deep green edges (fades via additive blending)
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  uniform vec2 uMouse;
  uniform vec2 uAstroids[${MAX_ASTEROIDS}];
  uniform float uAstroidStrengths[${MAX_ASTEROIDS}];
  uniform float uAstroidRadius;
  uniform float uRepelRadius;
  uniform float uRepelStrength;
  attribute float aScale;
  attribute vec3 aColor;
  varying vec3 vColor;

  void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);

    // Differential rotation: inner stars sweep faster than outer ones.
    float angle = atan(modelPosition.x, modelPosition.z);
    float distanceToCenter = length(modelPosition.xz);
    float angleOffset = (1.0 / (distanceToCenter + 0.2)) * 0.6 + uTime * 0.08;
    float c = cos(angle + angleOffset);
    float s = sin(angle + angleOffset);
    modelPosition.x = c * distanceToCenter;
    modelPosition.z = s * distanceToCenter;

    // Mouse repel: push stars away from the cursor's position on the galaxy plane.
    float distToMouse = distance(modelPosition.xz, uMouse);
    if (distToMouse < uRepelRadius) {
      vec2 dir = normalize(modelPosition.xz - uMouse);
      float force = (1.0 - distToMouse / uRepelRadius) * uRepelStrength;
      modelPosition.x += dir.x * force;
      modelPosition.z += dir.y * force;
    }

    // Asteroid attract: pull stars toward each active asteroid as it sweeps past.
    // Smoothstep falloff (instead of linear) softens the edge so the radius boundary isn't visible.
    for (int i = 0; i < ${MAX_ASTEROIDS}; i++) {
      float d = distance(modelPosition.xz, uAstroids[i]);
      if (d < uAstroidRadius) {
        vec2 dir = normalize(uAstroids[i] - modelPosition.xz);
        float force = smoothstep(uAstroidRadius, 0.0, d) * uAstroidStrengths[i];
        modelPosition.x += dir.x * force;
        modelPosition.z += dir.y * force;
      }
    }

    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uSize * aScale * (1.0 / -viewPosition.z);

    vColor = aColor;
  }
`

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform sampler2D uTexture;
  varying vec3 vColor;

  void main() {
    vec4 tex = texture2D(uTexture, gl_PointCoord);
    gl_FragColor = vec4(vColor, uOpacity) * tex;
  }
`

const { app } = useRuntimeConfig()
const dotUrl = `${app.baseURL || '/'}dot.png`

const canvas = ref<HTMLCanvasElement | null>(null)

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let points: THREE.Points
let geometry: THREE.BufferGeometry
let material: THREE.ShaderMaterial
let animationId = 0
let reducedMotion = false
let isCoarse = false
const clock = new THREE.Clock()
// Manual elapsed accumulator: we read getDelta() once per frame for the asteroid,
// so we can't also call getElapsedTime() (it would consume the same delta).
let elapsed = 0


// Device-orientation camera tilt (mobile only): smoothed offsets toward target.
let tiltX = 0
let tiltY = 0
let tiltTargetX = 0
let tiltTargetY = 0
let removeOrientationGesture: (() => void) | null = null
// Last viewport width — used to ignore height-only resizes (mobile URL bar on scroll).
let lastWidth = 0

// Mouse → galaxy-plane projection for the repel interaction.
const ndc = new THREE.Vector2(999, 999)
const raycaster = new THREE.Raycaster()
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
const hit = new THREE.Vector3()

// Concrete uniforms object (typed, no index-signature undefined) shared with the material.
const uniforms = {
  uTime: { value: 0 },
  uSize: { value: 26 },
  uOpacity: { value: 0.7 },
  uTexture: { value: null as THREE.Texture | null },
  uMouse: { value: new THREE.Vector2(999, 999) },
  uAstroids: { value: Array.from({ length: MAX_ASTEROIDS }, () => new THREE.Vector2(999, 999)) },
  uAstroidStrengths: { value: new Array(MAX_ASTEROIDS).fill(0) as number[] },
  uAstroidRadius: { value: 2.5 },
  uRepelRadius: { value: 1.2 },
  uRepelStrength: { value: 0.6 },
}

// Peak attraction strength, only reached when an asteroid is near the star plane.
const ASTROID_STRENGTH = 0.5
const ASTROID_SPEED = 3.5 // unités/seconde

interface Asteroid {
  active: boolean
  pos: THREE.Vector3
  from: THREE.Vector3
  to: THREE.Vector3
  t: number
  sprite: THREE.Sprite
  material: THREE.SpriteMaterial
}
const asteroids: Asteroid[] = []

const buildGalaxy = () => {
  geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(galaxy.count * 3)
  const colors = new Float32Array(galaxy.count * 3)
  const scales = new Float32Array(galaxy.count)

  const inside = new THREE.Color(galaxy.insideColor)
  const outside = new THREE.Color(galaxy.outsideColor)

  for (let i = 0; i < galaxy.count; i++) {
    const i3 = i * 3
    const radius = Math.random() * galaxy.radius
    const branchAngle = ((i % galaxy.branches) / galaxy.branches) * Math.PI * 2
    const spinAngle = radius * galaxy.spin

    const rand = () =>
      Math.pow(Math.random(), galaxy.randomnessPower) *
      (Math.random() < 0.5 ? 1 : -1) *
      galaxy.randomness *
      radius

    positions[i3] = Math.cos(branchAngle + spinAngle) * radius + rand()
    positions[i3 + 1] = rand() * 0.25 // flattened on Y
    positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * radius + rand()

    const mixed = inside.clone().lerp(outside, radius / galaxy.radius)
    colors[i3] = mixed.r
    colors[i3 + 1] = mixed.g
    colors[i3 + 2] = mixed.b

    scales[i] = Math.random()
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1))

  uniforms.uSize.value = 26 * Math.min(window.devicePixelRatio, 1.5)
  uniforms.uTexture.value = new THREE.TextureLoader().load(dotUrl)

  material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
  })

  points = new THREE.Points(geometry, material)
  scene.add(points)

  // Asteroid pool: each head is a white, additive sprite (same dot texture) that looks
  // like a comet consistent with the galaxy. All hidden until a click launches one.
  for (let i = 0; i < MAX_ASTEROIDS; i++) {
    const mat = new THREE.SpriteMaterial({
      map: uniforms.uTexture.value,
      color: new THREE.Color('#ffffff'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.setScalar(0.15)
    sprite.visible = false
    scene.add(sprite)
    asteroids.push({
      active: false,
      pos: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      t: 0,
      sprite,
      material: mat,
    })
  }
}

const renderFrame = () => {
  const dt = clock.getDelta()
  elapsed += dt
  const t = elapsed
  uniforms.uTime.value = t

  // Gentle camera auto-orbit, nudged by device tilt on mobile.
  tiltX += (tiltTargetX - tiltX) * 0.05
  tiltY += (tiltTargetY - tiltY) * 0.05
  camera.position.x = Math.cos(t * 0.05) * 5 + tiltX
  camera.position.z = Math.sin(t * 0.05) * 5
  camera.position.y = 3 + tiltY * 0.8
  camera.lookAt(0, 0, 0)

  for (let i = 0; i < asteroids.length; i++) {
    const a = asteroids[i]!
    if (a.active) {
      const dist = a.from.distanceTo(a.to)
      a.t += (ASTROID_SPEED * dt) / dist // normalized progression 0→1
      if (a.t >= 1) {
        a.t = 1
        a.active = false
      }
      a.pos.lerpVectors(a.from, a.to, a.t)
      uniforms.uAstroids.value[i]!.set(a.pos.x, a.pos.z)
      // Only attract when the asteroid is near the star plane (y≈0); fade the force
      // out as it climbs above or dives below, so it doesn't pull stars from afar.
      const planeFalloff = Math.max(0, 1 - Math.abs(a.pos.y) / 1.5)
      uniforms.uAstroidStrengths.value[i] = ASTROID_STRENGTH * planeFalloff
      a.sprite.position.copy(a.pos)
      a.sprite.visible = true
      a.material.opacity = Math.sin(a.t * Math.PI) // fade in then out along the path
    } else if (a.sprite.visible) {
      // Done: hide the head and stop attracting (otherwise stars stay clumped at the end).
      a.sprite.visible = false
      uniforms.uAstroids.value[i]!.set(999, 999)
      uniforms.uAstroidStrengths.value[i] = 0
    }
  }

  // Project the cursor onto the galaxy plane for the repel uniform.
  raycaster.setFromCamera(ndc, camera)
  if (raycaster.ray.intersectPlane(plane, hit)) {
    uniforms.uMouse.value.set(hit.x, hit.z)
  }

  renderer.render(scene, camera)
}

const animate = () => {
  animationId = requestAnimationFrame(animate)
  renderFrame()
}

const init = () => {
  if (!canvas.value) return

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 3, 5)

  buildGalaxy()

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  // updateStyle=false: let the CSS (h-full/w-full) size the canvas inside the fixed
  // wrapper, so three.js doesn't pin it to a pixel height that the mobile URL bar shifts.
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  lastWidth = window.innerWidth

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) renderFrame()
  else animate()
}

const onResize = () => {
  if (!renderer || !camera) return
  // On mobile the address bar hiding/showing during scroll fires resize with only a
  // height change — skip those so the fixed galaxy stays put while scrolling.
  if (isCoarse && window.innerWidth === lastWidth) return
  lastWidth = window.innerWidth
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight, false)
  uniforms.uSize.value = 26 * Math.min(window.devicePixelRatio, 1.5)
  if (reducedMotion) renderFrame()
}

const onPointerMove = (e: PointerEvent) => {
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
}

const onClick = (e: MouseEvent) => {
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
  raycaster.setFromCamera(ndc, camera)
  if (raycaster.ray.intersectPlane(plane, hit)) {
    launchAsteroid(hit.x, hit.z)
  }
}

// Spawn the asteroid high up, on the half of the sky opposite the camera, then
// dive it diagonally down onto the clicked point on the galaxy plane — so it moves
// away from the viewer (toward the plane) and attracts stars all along its descent.
const launchAsteroid = (x: number, z: number) => {
  // Grab a free slot, or recycle the most-advanced one if all are busy.
  const a = asteroids.find((s) => !s.active) ?? asteroids.reduce((m, s) => (s.t > m.t ? s : m), asteroids[0]!)
  const camAngle = Math.atan2(camera.position.z, camera.position.x)
  // Random angle within the opposite semicircle (camAngle + π, ±90°).
  const angle = camAngle + Math.PI + (Math.random() - 0.5) * Math.PI
  const r = 11 + Math.random() * 3 // far out
  const y = 4 + Math.random() * 2 // a bit above the plane
  a.from.set(Math.cos(angle) * r, y, Math.sin(angle) * r)
  // Pass through the clicked point (k=1) and keep going below the plane (k>1 → negative Y).
  const k = 1.6
  a.to.set(
    a.from.x + (x - a.from.x) * k,
    a.from.y * (1 - k),
    a.from.z + (z - a.from.z) * k,
  )
  a.pos.copy(a.from)
  a.t = 0
  a.active = true
}

const onDeviceOrientation = (e: DeviceOrientationEvent) => {
  // gamma = left/right tilt [-90,90], beta = front/back tilt [-180,180].
  // Map a comfortable ±30° window (beta neutral ~45°) to [-1, 1] for a subtle nudge.
  const clamp = (v: number) => Math.max(-1, Math.min(1, v))
  tiltTargetX = clamp((e.gamma ?? 0) / 30)
  tiltTargetY = clamp(((e.beta ?? 0) - 45) / 30)
}

// Enable orientation-driven camera tilt on mobile, handling the iOS 13+ permission
// prompt (which must be triggered from a user gesture).
const enableOrientation = () => {
  const DOE = window.DeviceOrientationEvent as
    | (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<'granted' | 'denied'> })
    | undefined
  if (!DOE) return

  const start = () => window.addEventListener('deviceorientation', onDeviceOrientation)

  if (typeof DOE.requestPermission === 'function') {
    const ask = () => {
      DOE.requestPermission!()
        .then((state) => { if (state === 'granted') start() })
        .catch(() => {})
      removeOrientationGesture?.()
    }
    window.addEventListener('touchend', ask, { once: true })
    removeOrientationGesture = () => window.removeEventListener('touchend', ask)
  } else {
    start()
  }
}

const onVisibility = () => {
  if (document.hidden) {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = 0
    }
  } else if (!animationId && !reducedMotion) {
    animate()
  }
}

onMounted(() => {
  // nextTick: ensure the <canvas> template ref is populated before init.
  nextTick(() => {
    isCoarse = window.matchMedia('(pointer: coarse)').matches
    init()
    window.addEventListener('resize', onResize)
    if (isCoarse) {
      // Mobile: drop the mouse-repel interaction, steer the camera with the gyroscope instead.
      enableOrientation()
    } else {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('click', onClick)
    }
    document.addEventListener('visibilitychange', onVisibility)
  })
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('click', onClick)
  window.removeEventListener('deviceorientation', onDeviceOrientation)
  removeOrientationGesture?.()
  document.removeEventListener('visibilitychange', onVisibility)
  geometry?.dispose()
  material?.dispose()
  asteroids.forEach((a) => a.material.dispose())
  uniforms.uTexture.value?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <!-- Sized wrapper (non-replaced element stretches to viewport); the canvas fills
       it via w-full/h-full/block so it is never left at the default 300x150. -->
  <div class="pointer-events-none fixed inset-0 -z-10" aria-hidden="true">
    <canvas ref="canvas" class="block h-full w-full" />
  </div>
</template>
