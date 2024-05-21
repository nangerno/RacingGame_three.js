import * as THREE from "three"
import * as dat from "lil-gui"
import gsap from "gsap"
import Stats from "three/examples/jsm/libs/stats.module.js"

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js"

import particleFire from "three-particle-fire"

import { Text } from "troika-three-text"

// import studio from "@theatre/studio"
// studio.initialize()
import { getProject, types } from "@theatre/core"

import cameraAnimation from "./db/animation.json"

/**
 ******************************
 ****** Three.js Initial ******
 ******************************
 */

/**
 * Init
 */
// Canvas
const canvas = document.querySelector("canvas.webgl")

// Scene
const scene = new THREE.Scene()
// scene.fog = new THREE.Fog(0x000000, 5, 10)

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 0.2, 0)
// camera.lookAt(0, 0, 0)
scene.add(camera)

// Loading
const manager = new THREE.LoadingManager()
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  if (itemsLoaded === itemsTotal) {
    setTimeout(() => {
      startPlatform()
    }, 3000)
  }
}

// Stats
let stats = new Stats()
document.body.appendChild(stats.dom)

/**
 * Addition
 */
// Environment
const cubeTextureLoader = new THREE.CubeTextureLoader(manager)
const environmentMap = cubeTextureLoader.load([
  "environment/Space/px.png",
  "environment/Space/nx.png",
  "environment/Space/py.png",
  "environment/Space/ny.png",
  "environment/Space/pz.png",
  "environment/Space/nz.png",
])
environmentMap.encoding = THREE.sRGBEncoding
scene.background = environmentMap
// scene.environment = environmentMap

// Controls
// const orbitControls = new OrbitControls(camera, canvas)
// orbitControls.target.set(2.5, 0.2, 0)
// orbitControls.enableDamping = true
// orbitControls.enabled = false

// Light
// const light = new THREE.AmbientLight(0xffffff, 5.0)
// scene.add(light)

// Axes
// const axes = new THREE.AxesHelper(10)
// scene.add(axes)

// Clock
const clock = new THREE.Clock()

// Loader
const dracoLoader = new DRACOLoader(manager)
dracoLoader.setDecoderPath("/draco/")

const gltfLoader = new GLTFLoader(manager)
gltfLoader.setDRACOLoader(dracoLoader)

const textureLoader = new THREE.TextureLoader(manager)

// Particle Fire
particleFire.install({ THREE: THREE })

/**
 ******************************
 ************ Main ************
 ******************************
 */

/**
 * Definitions
 */
let orbitControls
let platform, gateStart, gateEnd, per100, per100mid, rockBorder1, rockBorder2
let bicycle1, bicycle2, bicycle3
let bicycleLights = [
  new THREE.PointLight(0x8888ff, 2, 0.1, 0.5),
  new THREE.PointLight(0x8888ff, 2, 0.1, 0.5),
  new THREE.PointLight(0x8888ff, 2, 0.1, 0.5),
]
let bicycleColors = [0xff6666, 0x6666ff, 0xffffff]
let lightEnvMap
let textMaterialCountDown, textMaterialRace
let platformFires = [],
  platformLights = [],
  platformFireMeshes = [],
  platformFireWidthes = []
let lightYPosition = [],
  lightYFPosition = [],
  fireB = [],
  fireBPosition = [],
  fireBWidth = { value: 0 },
  fireY = [],
  fireYPosition = [],
  fireYWidth = { value: 0 }

let trackLength = 100
let progress = 0
let orbitControlTargetX = 2.35
let isOrbitAvailable = false
let isRaceStarted = false

// API
let bicycleNames = []
fetch("https://api.dnaracing.run/fbike/races/race/7abc524fa3")
  .then((response) => response.json())
  .then((data) => {
    bicycleNames[0] = data["result"]["transactions"][0]["hname"]
    document.getElementById("name1").innerText = bicycleNames[0]
    bicycleNames[1] = data["result"]["transactions"][1]["hname"]
    document.getElementById("name2").innerText = bicycleNames[1]
    bicycleNames[2] = data["result"]["transactions"][2]["hname"]
    document.getElementById("name3").innerText = bicycleNames[2]
  })
  .catch((error) => console.error("Error:", error))

// Lights
new RGBELoader(manager)
  .setPath("environment/")
  .load("wide_street_01_1k.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    lightEnvMap = texture
    // scene.environment = lightEnvMap
  })
const crystalLight = new THREE.PointLight(0x0099ff, 0)
const platformLight = new THREE.PointLight(0x224488, 0, 0.1)
const startLineLight = new THREE.PointLight(0xbbbbff, 0, 4, 0.5)
startLineLight.position.set(2.4, 0.3, 0)
scene.add(startLineLight)

/**
 * Particles
 */
// Blue Fire for platform Geometry
let platformFireGeometry = new particleFire.Geometry(0.015, 0.15, 100)

// Effeckseer
let context = null
let trailEffects = {}
effekseer.initRuntime("lib/effekseer.wasm", () => {
  context = effekseer.createContext()
  context.init(renderer.getContext())
  trailEffects["flame"] = context.loadEffect("images/flame.efk", 1.0)
  trailEffects["crystal"] = context.loadEffect("/images/crystal.efk")
  trailEffects["countdown"] = context.loadEffect("/images/countdown.efk")
  trailEffects["distanceMarker"] = context.loadEffect("/images/distanceMarker.efk")
})

/**
 * Texts
 */
textMaterialCountDown = new THREE.MeshBasicMaterial({ color: 0xd6d6d6 })
textMaterialCountDown.transparent = true
textMaterialCountDown.opacity = 0
const startCount = new Text()
scene.add(startCount)
startCount.text = "3"
startCount.fontSize = 0.18
startCount.font = "fonts/PermanentMarker-Regular.ttf"
startCount.position.set(2.5, 0.35, -0.05)
startCount.rotation.y = -Math.PI / 2
startCount.material = textMaterialCountDown
startCount.sync()

textMaterialRace = new THREE.MeshBasicMaterial({ color: 0x3355ff, opacity: 0.7 })
textMaterialRace.transparent = true
textMaterialRace.opacity = 0
const raceCount = new Text()
scene.add(raceCount)
raceCount.text = `${trackLength}m`
raceCount.font = "fonts/PermanentMarker-Regular.ttf"
raceCount.fontSize = 0.15
raceCount.position.set(11, 0.4, -0.2)
raceCount.rotation.y = -Math.PI / 2
raceCount.material = textMaterialRace
raceCount.sync()

/**
 * Models
 */
// Main Model
gltfLoader.load("models/Platform.glb", (gltf) => {
  platform = gltf.scene
  platform.traverse((child) => {
    if (child.name == "Crystal") {
      // child.visible = false
      child.material.envMap = lightEnvMap
      child.material.needsUpdate = true
      crystalLight.position.copy(child.position)
      scene.add(crystalLight)
    }
    if (child.name.startsWith("P_Fire")) {
      // platform fire mesh
      child.material.envMap = lightEnvMap
      child.material.needsUpdate = true
      child.material.transparent = true
      child.material.opacity = 0
      platformFireMeshes.push(child)

      // platform fire visual
      let platformFireMaterial = new particleFire.Material({ color: 0x2299ff })
      platformFireWidthes.push({ value: 0 })
      platformFireMaterial.setPerspective(
        camera.fov,
        platformFireWidthes[platformFireWidthes.length - 1].value
      )
      let platformFire = new THREE.Points(platformFireGeometry, platformFireMaterial)
      platformFires.push(platformFire)
      platformFires[platformFires.length - 1].position.copy(child.position)
      scene.add(platformFires[platformFires.length - 1])

      // platform fire light
      platformLights.push(platformLight.clone())
      platformLights[platformLights.length - 1].position.copy(child.position)
      platformLights[platformLights.length - 1].position.y += 0.05
      scene.add(platformLights[platformLights.length - 1])
    }
    if (child.name.startsWith("Fire_B")) {
      fireBPosition.push(child.position)
    }
    if (child.name == "Fire_Y") {
      child.visible = false
      let tempPos = new THREE.Vector3()
      let tempPoses = child.geometry.attributes.position.array
      child.updateMatrixWorld(true)
      for (let i = 0; i < tempPoses.length; i += 3) {
        tempPos.set(tempPoses[i], tempPoses[i + 1], tempPoses[i + 2])
        tempPos.applyMatrix4(child.matrixWorld)
        fireYPosition.push({ x: tempPos.x, y: tempPos.y, z: tempPos.z })
      }
    }
    if (child.name == "Light_Y") {
      child.visible = false
      let tempPos = new THREE.Vector3()
      let tempPoses = child.geometry.attributes.position.array
      child.updateMatrixWorld(true)
      for (let i = 0; i < tempPoses.length; i += 3) {
        tempPos.set(tempPoses[i], tempPoses[i + 1], tempPoses[i + 2])
        tempPos.applyMatrix4(child.matrixWorld)
        lightYPosition.push({ x: tempPos.x, y: tempPos.y, z: tempPos.z })
      }
    }
    if (child.name == "Light_Y_Final") {
      child.visible = false
      child.position.x = trackLength / 10 + 11
      let tempPos = new THREE.Vector3()
      let tempPoses = child.geometry.attributes.position.array
      child.updateMatrixWorld(true)
      for (let i = 0; i < tempPoses.length; i += 3) {
        tempPos.set(tempPoses[i], tempPoses[i + 1], tempPoses[i + 2])
        tempPos.applyMatrix4(child.matrixWorld)
        lightYFPosition.push({ x: tempPos.x, y: tempPos.y, z: tempPos.z })
      }
    }
    if (child.name == "Plane") {
      child.position.x = trackLength / 10 + 11
    }
  })
  scene.add(platform)
})

gltfLoader.load("models/Rock_Border.glb", (gltf) => {
  rockBorder1 = gltf.scene
  scene.add(rockBorder1)
  rockBorder2 = rockBorder1.clone()
  rockBorder2.position.x = rockBorder1.position.x + 10
  scene.add(rockBorder2)
})

gltfLoader.load("models/Gate_start.glb", (gltf) => {
  gateStart = gltf.scene
  scene.add(gateStart)
})

gltfLoader.load("models/Gate_end.glb", (gltf) => {
  gateEnd = gltf.scene
  gateEnd.position.x = trackLength / 10 + 11
  scene.add(gateEnd)
})

gltfLoader.load("models/per100.glb", (gltf) => {
  per100 = gltf.scene
  per100.traverse((child) => {
    if (child.isMesh) {
      child.material.transparent = true
      child.material.opacity = 1
    }
  })
  scene.add(per100)
})

gltfLoader.load("models/per100mid.glb", (gltf) => {
  per100mid = gltf.scene
  per100mid.traverse((child) => {
    if (child.isMesh) {
      child.material.transparent = true
      child.material.opacity = 1
    }
  })
  scene.add(per100mid)
})

gltfLoader.load("models/Bicycle.glb", (gltf) => {
  bicycle1 = gltf.scene
  bicycle1.traverse((child) => {
    if (child.isMesh) {
      if (child.material.name == "glow_blue") {
        child.material.emissive.set(bicycleColors[0])
        child.material.emissiveIntensity = 15
        child.material.color.set(bicycleColors[0])
        bicycleLights[0].color.set(bicycleColors[0])
        let color = bicycleColors[0].toString(16)
        document.getElementById("name1").style.color = "#" + color
        document.getElementById("name1").style.borderBottomColor = "#" + color
        scene.add(bicycleLights[0])
      }
      child.material.transparent = true
      child.material.opacity = 0
      child.material.envMap = lightEnvMap
      child.material.envMapIntensity = 9.0
      child.material.needsUpdate = true
    }
  })
  bicycle1.position.set(2.35, 0, -0.1)
  scene.add(bicycle1)
})

gltfLoader.load("models/Bicycle.glb", (gltf) => {
  bicycle2 = gltf.scene
  bicycle2.traverse((child) => {
    if (child.isMesh) {
      if (child.material.name == "glow_blue") {
        child.material.emissive.set(bicycleColors[1])
        child.material.emissiveIntensity = 1.5
        child.material.color.set(bicycleColors[1])
        bicycleLights[1].color.set(bicycleColors[1])
        let color = bicycleColors[1].toString(16)
        document.getElementById("name2").style.color = "#" + color
        document.getElementById("name2").style.borderBottomColor = "#" + color
        scene.add(bicycleLights[1])
      }
      child.material.transparent = true
      child.material.opacity = 0
      child.material.envMap = lightEnvMap
      child.material.needsUpdate = true
    }
  })
  bicycle2.position.set(2.35, 0, 0)
  scene.add(bicycle2)
})

gltfLoader.load("models/Bicycle.glb", (gltf) => {
  bicycle3 = gltf.scene
  bicycle3.traverse((child) => {
    if (child.isMesh) {
      if (child.material.name == "glow_blue") {
        child.material.emissive.set(bicycleColors[2])
        child.material.emissiveIntensity = 1.5
        child.material.color.set(bicycleColors[2])
        bicycleLights[2].color.set(bicycleColors[2])
        let color = bicycleColors[2].toString(16)
        document.getElementById("name3").style.color = "#" + color
        document.getElementById("name3").style.borderBottomColor = "#" + color
        scene.add(bicycleLights[2])
      }
      child.material.transparent = true
      child.material.opacity = 0
      child.material.envMap = lightEnvMap
      child.material.needsUpdate = true
    }
  })
  bicycle3.position.set(2.35, 0, 0.1)
  scene.add(bicycle3)
})

// Sequence
function startPlatform() {
  // Animate Platform Fires
  for (let i = 0; i < platformFires.length; i++) {
    sequence_platformFire(i)
  }

  // Light Crystal
  gsap.to(crystalLight, {
    intensity: 1,
    duration: 10,
    delay: 4,
    ease: "power2.in",
  })

  // Camera animation on platform
  project.ready.then(() =>
    sheet.sequence.play({ range: [0, 27] }).then(() => {
      startRacingEnvironment()
    })
  )

  // Set Orbit Control
  setTimeout(() => {
    setTimeout(() => {
      context.stopAll() // stop flame stream on platform
    }, 2000)
    startRacingEnvironment()
  }, 27500)

  // star tunnel to bicycle
  setTimeout(() => {
    playEffectCrystal("crystal", 0)
    playEffectCrystal("crystal", 1)
    playEffectCrystal("crystal", 2)
    gsap.to(startLineLight, {
      intensity: 0.8,
      duration: 4,
      ease: "power2.in",
      onComplete: () => {
        // Appearing Bicycles
        let appearBicycle1 = setInterval(() => {
          bicycle1.traverse((child) => {
            if (child.isMesh) {
              if (child.material.opacity < 1) {
                child.material.opacity += 0.01
              } else {
                clearInterval(appearBicycle1)
              }
            }
          })
        }, 15)
        let appearBicycle2 = setInterval(() => {
          bicycle2.traverse((child) => {
            if (child.isMesh) {
              if (child.material.opacity < 1) {
                child.material.opacity += 0.01
              } else {
                clearInterval(appearBicycle2)
              }
            }
          })
        }, 15)
        let appearBicycle3 = setInterval(() => {
          bicycle3.traverse((child) => {
            if (child.isMesh) {
              if (child.material.opacity < 1) {
                child.material.opacity += 0.01
              } else {
                clearInterval(appearBicycle3)
              }
            }
          })
        }, 15)
      },
    })
  }, 22500)
}

function sequence_platformFire(id) {
  if (id != 0) {
    gsap.to(platformFireWidthes[id], {
      value: window.innerHeight / 12,
      duration: 3,
      delay: id * 1 + 3 + 1.8,
      onStart: () => {
        // platform fire stream to crystal
        setTimeout(() => {
          playEffect("flame", id)
        }, 1000)
      },
    })
    gsap.to(platformLights[id], {
      intensity: 0.5,
      duration: 2,
      delay: id * 1 + 3 + 1.8,
      ease: "power2.in",
    })

    gsap.to(platformFireMeshes[id].material, {
      opacity: 1,
      duration: 3,
      delay: id * 1 + 3 + 1.5,
    })
  } else {
    gsap.to(platformFireWidthes[id], {
      value: window.innerHeight / 12,
      duration: 3,
      delay: 1.8,
      onStart: () => {
        // platform fire stream to crystal
        setTimeout(() => {
          playEffect("flame", id)
        }, 1000)
      },
    })
    gsap.to(platformLights[id], {
      intensity: 0.5,
      duration: 2,
      delay: 1.8,
      ease: "power2.in",
    })

    gsap.to(platformFireMeshes[id].material, {
      opacity: 1,
      duration: 3,
      delay: 1.5,
    })
  }
}

function countDown() {
  gsap.to(startCount.material, {
    opacity: 1,
    repeat: 1,
    yoyo: true,
    duration: 0.5,
    delay: 1,
    onStart: () => {
      playEffectCountdown("countdown")
    },
    onComplete: () => {
      playEffectCountdown("countdown")
      startCount.text = "2"
      startCount.sync()
      gsap.to(startCount.material, {
        opacity: 1,
        repeat: 1,
        yoyo: true,
        duration: 0.5,
        onComplete: () => {
          playEffectCountdown("countdown")
          startCount.position.z = -0.03
          startCount.text = "1"
          startCount.sync()
          gsap.to(startCount.material, {
            opacity: 1,
            repeat: 1,
            yoyo: true,
            duration: 0.5,
            onComplete: () => {
              playEffectCountdown("countdown")
              startCount.position.z = -0.05
              startCount.text = "GO"
              startCount.fontSize = 0.12
              startCount.position.set(2.5, 0.35, -0.08)
              startCount.sync()
              gsap.to(startCount.material, {
                opacity: 1,
                duration: 0.5,
              })
            },
          })
        },
      })
    },
  })
}

function startRacingEnvironment() {
  // Enable OrbitControl
  orbitControls = new OrbitControls(camera, canvas)
  orbitControls.target.set(2.35, 0.2, 0)
  orbitControls.enableDamping = true
  orbitControls.enablePan = false
  orbitControls.enabled = false
  orbitControls.update()
  isOrbitAvailable = true

  countDown()

  // start racing
  setTimeout(() => {
    context.stopAll()
    isRaceStarted = true
    orbitControls.enabled = true
  }, 5000)

  // Light Fire_B
  for (let i = 0; i < fireBPosition.length; i++) {
    let fireBMaterial = new particleFire.Material({ color: 0xaaaaff })
    fireBMaterial.setPerspective(camera.fov, fireBWidth.value)
    let fire = new THREE.Points(platformFireGeometry, fireBMaterial)
    fireB.push(fire)
    fireB[fireB.length - 1].position.copy(fireBPosition[i])
    scene.add(fireB[fireB.length - 1])
  }

  // Light Fire_Y
  for (let i = 0; i < fireYPosition.length; i++) {
    let fireYMaterial = new particleFire.Material({ color: 0xff8b33 })
    fireYMaterial.setPerspective(camera.fov, fireYWidth.value * 0.8)
    let fire = new THREE.Points(platformFireGeometry, fireYMaterial)
    fireY.push(fire)
    fireY[fireY.length - 1].position.copy(fireYPosition[i])
    scene.add(fireY[fireY.length - 1])
  }

  // Width set for fires on track
  gsap.fromTo(
    fireBWidth,
    { value: 0 },
    {
      value: window.innerHeight / 12,
      duration: 3,
    }
  )
  gsap.fromTo(
    fireYWidth,
    { value: 0 },
    {
      value: window.innerHeight / 12,
      duration: 3,
    }
  )

  // Light Light_Y
  for (let i = 0; i < lightYPosition.length; i++) {
    platformLights[i].position.copy(lightYPosition[i])
    platformLights[i].color.set(0xff8b33)
  }
}

function startRacing(delta) {
  const speed = 0.5 // Adjust speed to your liking
  document.getElementById("distance1").innerText = Math.min(
    trackLength,
    Math.max(Math.floor((bicycle1.position.x - 11) * 10), 0)
  )
  document.getElementById("distance2").innerText = Math.min(
    trackLength,
    Math.max(Math.floor((bicycle2.position.x - 11) * 10), 0)
  )
  document.getElementById("distance3").innerText = Math.min(
    trackLength,
    Math.max(Math.floor((bicycle3.position.x - 11) * 10), 0)
  )

  bicycleLights[0].position.set(
    bicycle1.position.x + 0.01,
    bicycle1.position.y + 0.02,
    bicycle1.position.z
  )
  bicycleLights[1].position.set(
    bicycle2.position.x + 0.01,
    bicycle2.position.y + 0.02,
    bicycle2.position.z
  )
  bicycleLights[2].position.set(
    bicycle3.position.x + 0.01,
    bicycle3.position.y + 0.02,
    bicycle3.position.z
  )

  let targetPosition1 = new THREE.Vector3(
    bicycle1.position.x + 2 * delta,
    bicycle1.position.y,
    bicycle1.position.z
  )
  let targetPosition2 = new THREE.Vector3(
    bicycle2.position.x + 2 * delta,
    bicycle2.position.y,
    bicycle2.position.z
  )
  let targetPosition3 = new THREE.Vector3(
    bicycle3.position.x + 2 * delta,
    bicycle3.position.y,
    bicycle3.position.z
  )

  bicycle1.position.lerp(targetPosition1, speed)
  bicycle2.position.lerp(targetPosition2, speed)
  bicycle3.position.lerp(targetPosition3, speed)

  if (isOrbitAvailable) {
    let bicyclePos = [bicycle1.position.x, bicycle2.position.x, bicycle3.position.x]
    bicyclePos.sort((a, b) => b - a)
    orbitControlTargetX = (bicyclePos[0] + bicyclePos[1]) / 2 // set mid point of most 2 advanced bikes
    camera.position.sub(orbitControls.target)
    orbitControls.target.set(orbitControlTargetX, 0.2, 0)
    camera.position.add(orbitControls.target)
    orbitControls.update()
    // Keep light on camera target
    startLineLight.position.x = orbitControlTargetX
  }
}

/**
 * Repeated Track Set
 */
function fireBSet() {
  fireBWidth.value = 0
  gsap.fromTo(
    fireBWidth,
    { value: 0 },
    {
      value: window.innerHeight / 12,
      duration: 3,
    }
  )

  setTimeout(() => {
    for (let i = 0; i < fireBPosition.length; i++) {
      fireB[i].position.set(
        fireBPosition[i].x + Math.floor(progress) * 10,
        fireBPosition[i].y,
        fireBPosition[i].z
      )
    }
  }, 100)
}

function fireYSet() {
  fireYWidth.value = 0
  gsap.fromTo(
    fireYWidth,
    { value: 0 },
    {
      value: window.innerHeight / 12,
      duration: 3,
    }
  )

  setTimeout(() => {
    for (let i = 0; i < fireYPosition.length; i++) {
      fireY[i].position.set(
        fireYPosition[i].x + Math.floor(progress) * 10,
        fireYPosition[i].y,
        fireYPosition[i].z
      )
    }
  }, 100)
}

function lightYSet() {
  for (let i = 0; i < lightYPosition.length; i++) {
    platformLights[i].intensity = 0
    gsap.fromTo(platformLights[i], { intensity: 0 }, { intensity: 0.8, duration: 5 })
  }
  setTimeout(() => {
    for (let i = 0; i < lightYPosition.length; i++) {
      platformLights[i].position.set(
        lightYPosition[i].x + Math.floor(progress) * 10,
        lightYPosition[i].y,
        lightYPosition[i].z
      )
    }
  }, 100)
}

function lightYFSet() {
  for (let i = 0; i < lightYFPosition.length; i++) {
    platformLights[i].intensity = 0
    gsap.fromTo(platformLights[i], { intensity: 0 }, { intensity: 0.8, duration: 5 })
  }
  setTimeout(() => {
    for (let i = 0; i < lightYFPosition.length; i++) {
      platformLights[i].position.set(
        lightYFPosition[i].x,
        lightYFPosition[i].y,
        lightYFPosition[i].z
      )
    }
  }, 100)
}

function per100Set() {
  per100.traverse((child) => {
    if (child.isMesh) {
      child.opacity = 0
      gsap.to(child, { opacity: 1, duration: 1 })
    }
  })
  setTimeout(() => {
    per100.position.x += 10
  }, 100)
}

function per100midSet() {
  per100mid.traverse((child) => {
    if (child.isMesh) {
      child.opacity = 0
      gsap.to(child, { opacity: 1, duration: 1 })
    }
  })
  setTimeout(() => {
    per100mid.position.x += 10
  }, 100)
}

function rockBorderSet() {
  if (progress >= 2) {
    if (progress % 2 == 0) {
      rockBorder1.position.x += 20
    } else if (progress % 2 == 1) {
      rockBorder2.position.x += 20
    }
  }
}

function distanceMarkerSet() {
  console.log("progress", Math.floor(progress))
  raceCount.material.opacity = 0
  raceCount.position.x = 11 + 10 * Math.floor(progress)
  raceCount.text = `${trackLength - Math.floor(progress) * 100}m`
  context.stopAll()
  playEffectDistanceMarker()
  gsap.to(raceCount.material, {
    opacity: 1,
    duration: 1,
    onComplete: () => {
      raceCount.sync()
    },
  })
}

/**
 * Play Effekseer Effect
 */
function playEffect(name, id) {
  // var handle = context.play(trailEffects[name], 0, 0, 0)
  // handle.setLocation(
  //   platformFireMeshes[id].position.x,
  //   platformFireMeshes[id].position.y,
  //   platformFireMeshes[id].position.z
  // )
  // handle.setRotation(0, (-id * Math.PI) / 4, 0)
}

function playEffectCrystal(name, id) {
  let handle = context.play(trailEffects[name], 0, 0, 0)
  console.log(crystalLight.position)
  console.log(bicycleLights[0].position)
  handle.setLocation(
    crystalLight.position.x,
    crystalLight.position.y + 0.2,
    crystalLight.position.z
  )
  handle.setRotation(0, ((id - 1) * Math.PI) / 60, 0)
}

function playEffectCountdown() {
  let handle = context.play(trailEffects["countdown"], 0, 0, 0)
  handle.setLocation(2.5, 0.22, 0)
}

function playEffectDistanceMarker() {
//   let handle = context.play(trailEffects["distanceMarker"], 0, 0, 0)
//   handle.setRotation(0, Math.PI / 2, 0)
//   handle.setLocation(11 + 10 * Math.floor(progress), 0.015, 0)
}

/**
 * Theatre.js
 */

const project = getProject("THREE.js x Theatre.js", { state: cameraAnimation })

const sheet = project.sheet("Animated scene")

const cameraValue = sheet.object("Camera", {
  rotation: types.compound({
    x: types.number(camera.rotation.x, { range: [-2, 2] }),
    y: types.number(camera.rotation.y, { range: [-2, 2] }),
    z: types.number(camera.rotation.z, { range: [-2, 2] }),
  }),
  position: types.compound({
    x: types.number(camera.position.x, { range: [-10, 10] }),
    y: types.number(camera.position.y, { range: [-10, 10] }),
    z: types.number(camera.position.z, { range: [-10, 10] }),
  }),
})

cameraValue.onValuesChange((values) => {
  camera.rotation.set(
    values.rotation.x * Math.PI,
    values.rotation.y * Math.PI,
    values.rotation.z * Math.PI
  )
  camera.position.set(values.position.x, values.position.y, values.position.z)
})

/**
 * Sizes
 */
window.addEventListener("resize", () => {
  // Update camera
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  if (platform) {
    for (let i = 0; i < platformFires.length; i++) {
      platformFires[i].material.setPerspective(camera.fov, platformFireWidthes[i].value)
    }
  }
})

/**
 * Animate
 */
const animate = () => {
  // Delta Time
  const deltaTime = clock.getDelta()

  // Stats
  stats.update()

  if (isRaceStarted) startRacing(deltaTime)

  try {
    context.update(deltaTime * 30.0)
    renderer.render(scene, camera)
    context.setProjectionMatrix(camera.projectionMatrix.elements)
    context.setCameraMatrix(camera.matrixWorldInverse.elements)
    context.draw()
  } catch {}

  if (platform) {
    for (let i = 0; i < platformFires.length; i++) {
      platformFires[i].material.setPerspective(camera.fov, platformFireWidthes[i].value)
      platformFires[i].material.update(deltaTime)
    }
    for (let i = 0; i < fireB.length; i++) {
      fireB[i].material.setPerspective(camera.fov, fireBWidth.value)
      fireB[i].material.update(deltaTime)
    }
    for (let i = 0; i < fireY.length; i++) {
      fireY[i].material.setPerspective(camera.fov, fireYWidth.value * 0.8)
      fireY[i].material.update(deltaTime)
    }
  }

  // Update controls
  if (isOrbitAvailable) {
    // Track progress
    let temp = progress
    progress = Math.floor((orbitControlTargetX / 10 - 0.1) * 2) / 2 // set progress of race
    if (orbitControlTargetX > trackLength / 10 + 10.85) {
      isOrbitAvailable = false
      orbitControls.enabled = false
    }
    if (temp != progress) {
      let decimal = Math.round((progress - Math.floor(progress)) * 2) / 2
      if (decimal === 0) {
        // Bicycle passed 100m
        // Move per100mid objects
        fireYSet()
        per100midSet()
        rockBorderSet()
      } else if (decimal === 0.5) {
        // Bicycle passed 50m
        // Move per100 objects
        if (progress < trackLength / 100) {
          distanceMarkerSet()
          if (progress != 0.5) {
            distanceMarkerSet()
            fireBSet()
            lightYSet()
            per100Set()
          }
        } else {
          lightYFSet()
        }
      } else {
        console.log(progress)
      }
    }
  }

  // Call tick again on the next frame
  window.requestAnimationFrame(animate)
}

animate()
