<script setup lang="ts">
import * as THREE from 'three'

// Approximation of the --primary accent (oklch(0.8 0.16 155)) as a hex,
// since three.Color cannot parse oklch. Tune here if needed.
const ACCENT = 0x57d6a0
const POINT_COUNT = 800

const canvas = ref<HTMLCanvasElement | null>(null)

let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let points: THREE.Points | null = null
let geometry: THREE.BufferGeometry | null = null
let material: THREE.PointsMaterial | null = null
let frameId = 0
let reducedMotion = false
const pointer = { x: 0, y: 0 }

const onResize = () => {
  if (!renderer || !camera) return
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

const onPointerMove = (e: PointerEvent) => {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1
  pointer.y = (e.clientY / window.innerHeight) * 2 - 1
}

const renderFrame = () => {
  if (!renderer || !scene || !camera || !points) return
  points.rotation.y += 0.0003
  points.rotation.x += 0.00015
  // subtle mouse parallax
  camera.position.x += (pointer.x * 0.5 - camera.position.x) * 0.02
  camera.position.y += (-pointer.y * 0.5 - camera.position.y) * 0.02
  camera.lookAt(scene.position)
  renderer.render(scene, camera)
}

const loop = () => {
  renderFrame()
  frameId = requestAnimationFrame(loop)
}

const start = () => {
  if (frameId || reducedMotion) return
  frameId = requestAnimationFrame(loop)
}

const stop = () => {
  if (frameId) cancelAnimationFrame(frameId)
  frameId = 0
}

const onVisibility = () => {
  if (document.hidden) stop()
  else start()
}

onMounted(() => {
  if (!canvas.value) return
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.z = 6

  geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(POINT_COUNT * 3)
  for (let i = 0; i < POINT_COUNT * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 12
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  material = new THREE.PointsMaterial({
    color: ACCENT,
    size: 0.025,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    sizeAttenuation: true,
  })
  points = new THREE.Points(geometry, material)
  scene.add(points)

  renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)

  window.addEventListener('resize', onResize)
  window.addEventListener('pointermove', onPointerMove)
  document.addEventListener('visibilitychange', onVisibility)

  if (reducedMotion) {
    renderFrame() // single static frame, no animation loop
  } else {
    start()
  }
})

onBeforeUnmount(() => {
  stop()
  window.removeEventListener('resize', onResize)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('visibilitychange', onVisibility)
  geometry?.dispose()
  material?.dispose()
  renderer?.dispose()
  renderer = null
  scene = null
  camera = null
  points = null
})
</script>

<template>
  <canvas ref="canvas" class="pointer-events-none fixed inset-0 -z-10" aria-hidden="true" />
</template>
