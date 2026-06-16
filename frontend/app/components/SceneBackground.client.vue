<script setup lang="ts">
import * as THREE from 'three'

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
const clock = new THREE.Clock()

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
  uRepelRadius: { value: 1.2 },
  uRepelStrength: { value: 0.6 },
}

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
}

const renderFrame = () => {
  const t = clock.getElapsedTime()
  uniforms.uTime.value = t

  // Gentle camera auto-orbit.
  camera.position.x = Math.cos(t * 0.05) * 5
  camera.position.z = Math.sin(t * 0.05) * 5
  camera.position.y = 3
  camera.lookAt(0, 0, 0)

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
  renderer.setSize(window.innerWidth, window.innerHeight)

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) renderFrame()
  else animate()
}

const onResize = () => {
  if (!renderer || !camera) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  uniforms.uSize.value = 26 * Math.min(window.devicePixelRatio, 1.5)
  if (reducedMotion) renderFrame()
}

const onPointerMove = (e: PointerEvent) => {
  ndc.x = (e.clientX / window.innerWidth) * 2 - 1
  ndc.y = -(e.clientY / window.innerHeight) * 2 + 1
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
    init()
    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onPointerMove)
    document.addEventListener('visibilitychange', onVisibility)
  })
})

onBeforeUnmount(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
  geometry?.dispose()
  material?.dispose()
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
