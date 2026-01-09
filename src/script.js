import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import GUI from 'lil-gui'
import gsap from 'gsap' 

// ... [TA CONFIGURATION TEAM RESTE IDENTIQUE] ...
const teamConfig = [
    { id: 1, path: '/models/matheo-3d.glb', name: 'Mathéo Pons', role: 'Rageux tout pipou', timeStart: 4, duration: 2, position: { x: 1.1, y: 1.6, z: 0 }, scale: 2.5, rotationY: 5.6 },
    { id: 2, path: '/models/benjamin-3d.glb', name: 'Benjamin Planson', role: 'Comique sans pitié', timeStart: 6, duration: 2, position: { x: 0, y: 0, z: 0 }, scale: 6.5, rotationY: 0 },
    { id: 3, path: '/models/lyman-3d.glb', name: 'Lyman Abid', role: 'Développeur de mêmes', timeStart: 8, duration: 2, position: { x: 1.6, y: 0, z: 0 }, scale: 4, rotationY: 5.4 },
    { id: 4, path: '/models/oriane-3d.glb', name: 'Oriane Barreau', role: 'Alternante Vegan', timeStart: 10, duration: 2, position: { x: 2.2, y: 0, z: 0 }, scale: 5.5, rotationY: 5.2 },
    { id: 5, path: '/models/shupu-3d.glb', name: 'Shupu Liu', role: 'Calculateur CSS', timeStart: 12, duration: 2, position: { x: -3.5, y: 0, z: 0 }, scale: 5, rotationY: 1.1 },
    { id: 6, path: '/models/jihad-3d.glb', name: 'Jihad Oujadi', role: 'Dev front qui prefere les backs', timeStart: 14, duration: 2, position: { x: 1.6, y: 0, z: 0 }, scale: 3.5, rotationY: 5.4  }
]

/**
 * Base
 */
const gui = new GUI({ title: 'Panneau de Pilotage' })
const canvas = document.querySelector('canvas.webgl')
const scene = new THREE.Scene()
scene.background = null; 
const endPhrase = document.getElementById('end-phrase')

/**
 * INTERACTION SETUP
 */
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
let isInteractive = false 
let isDragging = false
let currentIntersected = null 
let previousMouseX = 0
// Suppression des variables de zoom targetCameraZ/X

/**
 * Video & Controls
 */
const video = document.getElementById('bg-video')
const startScreen = document.getElementById('start-screen')
const startBtn = document.getElementById('start-btn')
const controlBtn = document.getElementById('control-btn')
const loaderText = document.querySelector('.loader')

let masterTimeline = null 

/**
 * Loaders
 */
const loadingManager = new THREE.LoadingManager(
    () => {
        loaderText.style.display = 'none'
        startBtn.style.display = 'flex'
    },
    (itemUrl, itemsLoaded, itemsTotal) => {
        const progress = Math.round((itemsLoaded / itemsTotal) * 100)
        loaderText.innerHTML = `Chargement ${progress}%`
    }
)

const gltfLoader = new GLTFLoader(loadingManager)

/**
 * Models Management
 */
const loadedModels = [] 
const labelsContainer = document.getElementById('labels-container')

const createLabel = (config) => {
    const div = document.createElement('div')
    div.classList.add('point-label')
    div.id = `label-${config.id}`
    div.innerHTML = `<h3>${config.name}</h3><p>${config.role}</p>`
    labelsContainer.appendChild(div)
    return div
}

const updateModelTransform = (modelObj) => {
    const { mesh, config } = modelObj
    mesh.position.set(config.position.x, config.position.y, config.position.z)
    mesh.rotation.y = config.rotationY
}

// Chargement
teamConfig.forEach((config, index) => {
    gltfLoader.load(config.path, (gltf) => {
        const model = gltf.scene
        
        model.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.envMapIntensity = 1 
                child.material.needsUpdate = true
            }
        })
        
        model.scale.set(0, 0, 0)
        scene.add(model)

        const modelObj = {
            mesh: model,
            config: config,
            label: createLabel(config),
            initialIndex: index
        }
        
        updateModelTransform(modelObj)
        loadedModels.push(modelObj)

        const folder = gui.addFolder(`🎬 ${config.name}`)
        folder.add(config, 'timeStart').min(0).max(60).step(0.1).name('Apparition (sec)').onChange(rebuildTimeline)
        folder.add(config, 'duration').min(1).max(20).step(0.1).name('Durée (sec)').onChange(rebuildTimeline)
        
        const posFolder = folder.addFolder('Position & Scale')
        posFolder.add(config.position, 'x', -5, 5, 0.1).name('X').onChange(() => updateModelTransform(modelObj))
        posFolder.add(config.position, 'y', -5, 5, 0.1).name('Y').onChange(() => updateModelTransform(modelObj))
        posFolder.add(config.position, 'z', -5, 5, 0.1).name('Z').onChange(() => updateModelTransform(modelObj))
        posFolder.add(config, 'scale', 0.1, 5, 0.1).name('Taille Globale').onChange(() => updateModelTransform(modelObj))
        posFolder.add(config, 'rotationY', 0, Math.PI * 2, 0.1).name('Rotation Y').onChange(() => updateModelTransform(modelObj))
    })
})

const getSortedModels = () => loadedModels.sort((a, b) => a.initialIndex - b.initialIndex)

/**
 * Setup Scene
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
directionalLight.position.set(1, 2, 3)
scene.add(directionalLight)

const lightTarget = new THREE.Object3D()
scene.add(lightTarget)
directionalLight.target = lightTarget

const sizes = { width: window.innerWidth, height: window.innerHeight }

window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(0, 1, 4)
scene.add(camera)

const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true })
renderer.outputColorSpace = THREE.SRGBColorSpace 
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x000000, 0)

/**
 * LOGIQUE TIMELINE
 */
function rebuildTimeline() {
    if (masterTimeline) masterTimeline.kill()

    masterTimeline = gsap.timeline({ paused: true })
    const sorted = getSortedModels()

    sorted.forEach((obj) => {
        const { mesh, label, config } = obj
        
        masterTimeline.fromTo(mesh.scale, 
            { x: 0, y: 0, z: 0 }, 
            { x: config.scale, y: config.scale, z: config.scale, duration: 0.6, ease: 'back.out(1.7)' }, 
            config.timeStart
        )

        masterTimeline.fromTo(label, 
            { autoAlpha: 0, x: -50 }, 
            { autoAlpha: 1, x: 0, duration: 0.8, ease: 'power2.out' }, 
            config.timeStart
        )

        const endTime = config.timeStart + config.duration
        
        masterTimeline.to(mesh.scale, 
            { x: 0, y: 0, z: 0, duration: 0.5, ease: 'back.in(1.7)' }, 
            endTime
        )
        
        masterTimeline.to(label, 
            { autoAlpha: 0, x: 50, duration: 0.5 }, 
            endTime
        )
    })

    masterTimeline.time(video.currentTime)
    if (!video.paused) masterTimeline.play()
}

// Alignement final
const alignAllModels = () => {
    if(masterTimeline) masterTimeline.pause()
    
    // 1. DESACTIVER ORBIT CONTROLS (Camera Fixe)
    controls.enabled = false 
    
    // On met la caméra à la bonne place finale
    gsap.to(camera.position, { x: 0, y: 1, z: 4, duration: 2, ease: "power2.inOut" })
    gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 2, ease: "power2.inOut" })

    // 2. ACTIVER LE MODE INTERACTIF
    setTimeout(() => {
        isInteractive = true
    }, 2000)

    const sorted = getSortedModels()
    const spacing = 1.5
    const totalWidth = (sorted.length - 1) * spacing
    
    sorted.forEach((obj, i) => {
        const xPos = (i * spacing) - (totalWidth / 2)
        
        gsap.to(obj.mesh.scale, { x: 1, y: 1, z: 1, duration: 1, delay: i * 0.1, ease: 'elastic.out(1, 0.5)' })
        // Remise à zéro de la rotation pour l'interaction
        gsap.to(obj.mesh.rotation, { y: 0, duration: 1, delay: i * 0.1 }) 
        gsap.to(obj.mesh.position, { x: xPos, y: -1, z: 0, duration: 1.5, ease: 'power3.out' })
        
        gsap.to(obj.label, { autoAlpha: 0, duration: 0.5 }) 
    })

    // Animation de la phrase de fin
    gsap.fromTo(endPhrase, 
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 1.3, delay: 0, ease: 'power3.inOut' }
    )
}

/**
 * CONTROLES
 */
const togglePlayPause = () => {
    if (video.paused) {
        video.play()
        if (masterTimeline) masterTimeline.play()
        controlBtn.innerHTML = '❚❚ Pause'
    } else {
        video.pause()
        if (masterTimeline) masterTimeline.pause()
        controlBtn.innerHTML = '▶ Reprendre'
    }
}

controlBtn.addEventListener('click', togglePlayPause)

startBtn.addEventListener('click', () => {
    startScreen.style.opacity = 0
    setTimeout(() => startScreen.style.display = 'none', 500)
    controlBtn.style.display = 'block'
    rebuildTimeline()
    video.style.display = 'block'
    video.volume = 0.5 
    video.play()
    masterTimeline.play()
})

video.addEventListener('ended', () => {
    controlBtn.style.display = 'none'
    alignAllModels()
})

// Gestion Mouse Move / Drag pour la rotation
window.addEventListener('mousemove', (event) => {
    pointer.x = (event.clientX / sizes.width) * 2 - 1
    pointer.y = -(event.clientY / sizes.height) * 2 + 1

    if (isInteractive) {
        if (isDragging) {
            canvas.style.cursor = 'grabbing'
        } else if (currentIntersected) {
            canvas.style.cursor = 'grab'
        } else {
            canvas.style.cursor = 'default'
        }
    }

    if (isDragging && currentIntersected) {
        const deltaX = event.clientX - previousMouseX
        currentIntersected.rotation.y += deltaX * 0.005
        previousMouseX = event.clientX
    }
})

window.addEventListener('mousedown', (event) => {
    if (isInteractive && currentIntersected) {
        isDragging = true
        previousMouseX = event.clientX
        if(masterTimeline) masterTimeline.pause() 
    }
})

window.addEventListener('mouseup', () => {
    isDragging = false
})

// SUPPRESSION DE L'ECOUTEUR 'WHEEL' ICI

/**
 * Loop
 */
const clock = new THREE.Clock()
const debugObj = { videoTime: 0 }
gui.add(debugObj, 'videoTime').disable()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    debugObj.videoTime = video.currentTime.toFixed(2)

    if (masterTimeline && Math.abs(masterTimeline.time() - video.currentTime) > 0.1) {
       masterTimeline.time(video.currentTime)
    }

    // Gestion de la lumière
    const activeModelObj = loadedModels.find(obj => {
        const t = video.currentTime
        return t >= obj.config.timeStart && t <= (obj.config.timeStart + obj.config.duration)
    })

    let targetPos = new THREE.Vector3(0, 0, 0)
    
    if (!isInteractive) {
        if (activeModelObj) {
            targetPos.copy(activeModelObj.mesh.position)
            labelsContainer.style.opacity = '1'
        } else {
            labelsContainer.style.opacity = '0'
        }
        controls.update()
    } else {
        // --- MODE INTERACTIF (FIN) ---
        labelsContainer.style.opacity = '0'
        
        // RAYCASTER
        raycaster.setFromCamera(pointer, camera)
        
        const modelMeshes = loadedModels.map(item => item.mesh)
        const intersects = raycaster.intersectObjects(modelMeshes, true)

        if (intersects.length > 0) {
            let object = intersects[0].object
            while (object.parent && !modelMeshes.includes(object)) {
                object = object.parent
            }
            if (modelMeshes.includes(object)) {
                currentIntersected = object
            }
        } else {
            if (!isDragging) {
                currentIntersected = null
            }
        }
        // SUPPRESSION DU LERP DE LA CAMERA ICI
    }
    
    lightTarget.position.lerp(targetPos, 0.05)

    renderer.render(scene, camera)
    window.requestAnimationFrame(tick)
}

tick()