// --- Active Nav Link Highlighting ---
const allNavItems = document.querySelectorAll('.nav-item');
const currentPath = window.location.pathname.split('/').pop();

let activePage = 'index'; // Default to index
if (currentPath === 'about.html') {
    activePage = 'about';
} else if (currentPath === 'product-detail.html') {
    activePage = 'index'; 
} else if (currentPath === 'index.html' || currentPath === '') {
    activePage = 'index';
}

allNavItems.forEach(item => {
    item.classList.remove('nav-link-active', 'text-gray-900');
    item.classList.add('text-gray-500');

    if (item.dataset.page === activePage) {
        item.classList.add('nav-link-active', 'text-gray-900');
        item.classList.remove('text-gray-500');
    }
});

// --- SCROLL ANIMATIONS (Intersection Observer) ---
// This watches for elements with 'animate-on-scroll' entering the viewport

const observerOptions = {
    root: null, // use the viewport
    rootMargin: '0px',
    threshold: 0.1 // trigger when 10% of the element is visible
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target); // Stop watching once animated
        }
    });
}, observerOptions);

// Start watching all elements with the animation class
document.querySelectorAll('.animate-on-scroll').forEach((element) => {
    observer.observe(element);
});




// main.js - Complete with auto-scaling
window.addEventListener('load', function() {
    console.log('Page fully loaded, initializing...');
    init();
});

gsap.registerPlugin(ScrollTrigger);

let scene, camera, renderer, model;
let isModelLoaded = false;
let gltfLoader = null;
let originalModelScale = 1;
let currentModelScale = 1;

function init() {
    console.log('Initializing 3D viewer...');
    
    // Setup Three.js
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 5;
    
    renderer = new THREE.WebGLRenderer({
        canvas: document.getElementById('model-canvas'),
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    
    // Add lighting
    setupLights();
    
    // Configure the GLTF loader with Draco support
    gltfLoader = configureGLTFLoader();
    
    // Try to load model
    tryLoadModel();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation
    animate();

    quickBandingFixes();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
}

function configureGLTFLoader() {
    console.log('Configuring GLTFLoader...');
    
    // Create the loader
    const loader = new THREE.GLTFLoader();
    
    // Check if DracoLoader is available and configure it
    if (typeof THREE.DRACOLoader !== 'undefined') {
        console.log('Adding Draco support to GLTFLoader...');
        
        try {
            const dracoLoader = new THREE.DRACOLoader();
            
            // Set the decoder path
            dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
            
            // Set the loader
            loader.setDRACOLoader(dracoLoader);
            console.log('✅ Draco support configured successfully');
        } catch (dracoError) {
            console.warn('Could not configure Draco loader:', dracoError);
            console.log('Continuing without Draco compression support');
        }
    } else {
        console.log('DRACOLoader not available, loading without Draco compression');
    }
    
    return loader;
}

function tryLoadModel() {
    console.log('Attempting to load model...');
    
    if (!gltfLoader) {
        console.error('GLTFLoader not configured!');
        updateLoaderMessage('3D loader failed. Using demonstration.');
        
        setTimeout(() => {
            createFallbackModel();
            hideLoader();
            setupScrollAnimations();
        }, 1000);
        return;
    }
    
    // Check if we're running locally
    const isLocalFile = window.location.protocol === 'file:';
    
    if (isLocalFile) {
        console.log('Running from file system, using CDN model...');
        loadCDNModel();
    } else {
        console.log('Running from server, trying local model...');
        loadModel('models/product/product.glb');
    }
}

function loadCDNModel() {
    // Use a model that doesn't require Draco compression
    const cdnModels = [
        {
            url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Duck/glTF/Duck.gltf',
            name: 'Duck',
            manualScale: 0.8,
            requiresDraco: false
        },
        {
            url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/FlightHelmet/glTF/FlightHelmet.gltf',
            name: 'Flight Helmet',
            manualScale: 0.7,
            requiresDraco: false
        },
        {
            url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Suzanne/glTF/Suzanne.gltf',
            name: 'Suzanne',
            manualScale: 1.0,
            requiresDraco: false
        },
        {
            url: 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/LittlestTokyo/glTF/LittlestTokyo.gltf',
            name: 'Tokyo Scene',
            manualScale: 0.01,
            requiresDraco: false
        }
    ];
    
    // Select a non-Draco model
    const selectedModel = cdnModels[1]; // Flight Helmet (looks good)
    
    updateLoaderMessage(`Loading: ${selectedModel.name}...`);
    
    // Use the pre-configured loader
    gltfLoader.load(
        selectedModel.url,
        function(gltf) {
            console.log(`✅ ${selectedModel.name} loaded successfully!`);
            model = gltf.scene;
            
            // Apply manual scale first
            if (selectedModel.manualScale) {
                model.scale.set(selectedModel.manualScale, selectedModel.manualScale, selectedModel.manualScale);
            }
            
            // Auto-scale the model based on its size
            autoScaleModel(model);
            
            // Setup model materials and shadows
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Enhance material appearance
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            scene.add(model);
            isModelLoaded = true;
            centerModel();
            hideLoader();
            setupScrollAnimations();
            
            // Show demo notice
            showDemoNotice('Using demonstration model: ' + selectedModel.name);
        },
        function(xhr) {
            const percent = (xhr.loaded / xhr.total) * 100;
            updateProgressBar(percent);
            updateLoaderMessage(`Loading demo: ${Math.round(percent)}%`);
        },
        function(error) {
            console.error('Failed to load CDN model:', error);
            updateLoaderMessage('Demo model failed. Using built-in model.');
            
            // Fallback to built-in model
            createFallbackModel();
            hideLoader();
            setupScrollAnimations();
            showDemoNotice('Using built-in 3D model');
        }
    );
}

function loadModel(modelPath) {
    console.log('Loading model from:', modelPath);
    
    updateLoaderMessage('Loading 3D model...');
    
    // Use the pre-configured loader (already has Draco support if available)
    gltfLoader.load(
        modelPath,
        function(gltf) {
            console.log('✅ Model loaded successfully!');
            model = gltf.scene;
            
            // Auto-scale the model based on its size
            autoScaleModel(model);
            
            // Setup model
            model.traverse(function(child) {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Enhance material appearance
                    if (child.material) {
                        child.material.needsUpdate = true;
                    }
                }
            });
            
            scene.add(model);
            isModelLoaded = true;
            centerModel();
            hideLoader();
            setupScrollAnimations();
        },
        function(xhr) {
            const percent = (xhr.loaded / xhr.total) * 100;
            updateProgressBar(percent);
            updateLoaderMessage(`Loading model: ${Math.round(percent)}%`);
        },
        function(error) {
            console.error('Failed to load model:', error);
            
            // Check if it's a Draco error
            if (error.message.includes('DRACOLoader') || error.message.includes('Draco')) {
                console.log('Model requires Draco, trying CDN model instead...');
                updateLoaderMessage('Model requires special decoder. Loading demonstration...');
                loadCDNModel();
            } else {
                console.log('Other loading error, trying CDN model...');
                updateLoaderMessage('Local model not found. Loading demonstration...');
                loadCDNModel();
            }
        }
    );
}

function autoScaleModel(model) {
    if (!model) return;
    
    console.log('Scaling model to 5% of original size...');
    
    // Get model bounding box to determine original size
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    
    const maxDimension = Math.max(size.x, size.y, size.z);
    
    console.log('Original model dimensions:', {
        width: size.x.toFixed(2),
        height: size.y.toFixed(2), 
        depth: size.z.toFixed(2),
        max: maxDimension.toFixed(2)
    });
    
    // EXACTLY 5% SCALE
    const scaleFactor = 0.02; // 5% of original
    
    console.log('Applying 5% scale factor:', scaleFactor);
    
    // Apply the 5% scale
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    // Store the scale values
    originalModelScale = scaleFactor;
    currentModelScale = scaleFactor;
    
    // Calculate and log new size
    box.setFromObject(model);
    box.getSize(size);
    const newMaxDimension = Math.max(size.x, size.y, size.z);
    
    console.log('After 5% scaling - new dimensions:', {
        width: size.x.toFixed(2),
        height: size.y.toFixed(2),
        depth: size.z.toFixed(2),
        max: newMaxDimension.toFixed(2)
    });
    
    console.log('Model reduced to 5% of original size');
    
    return scaleFactor;
}

function createFallbackModel() {
    console.log('Creating fallback demonstration model...');
    
    const group = new THREE.Group();
    
    // Create a well-proportioned smartphone-like model
    const bodyGeometry = new THREE.BoxGeometry(0.8, 1.6, 0.1);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x3498db,
        metalness: 0.9,
        roughness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.1
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    
    // Add screen
    const screenGeometry = new THREE.PlaneGeometry(0.75, 1.5);
    const screenMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.z = 0.06;
    
    // Add camera bump
    const cameraGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.02, 16);
    const cameraMaterial = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const camera = new THREE.Mesh(cameraGeometry, cameraMaterial);
    camera.position.set(0, 0.75, 0.06);
    
    // Add side buttons
    const buttonGeometry = new THREE.BoxGeometry(0.04, 0.2, 0.03);
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const button1 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    const button2 = new THREE.Mesh(buttonGeometry, buttonMaterial);
    
    button1.position.set(0.42, 0.3, 0);
    button2.position.set(0.42, -0.3, 0);
    
    group.add(body);
    group.add(screen);
    group.add(camera);
    group.add(button1);
    group.add(button2);
    
    model = group;
    scene.add(model);
    isModelLoaded = true;
    
    // Apply auto-scaling to fallback model as well
    autoScaleModel(model);
    centerModel();
    
    console.log('Fallback model created and auto-scaled');
}

function centerModel() {
    if (!model) return;
    
    console.log('Centering model (balanced)...');
    
    // Get bounding box
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // Center the model
    model.position.x = -center.x;
    model.position.y = -center.y;
    model.position.z = -center.z;
    
    // Get size after scaling
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxSize = Math.max(size.x, size.y, size.z);
    
    console.log('Centered model size:', maxSize.toFixed(2));
    
    // Balanced camera distance - not too close, not too far
    const cameraDistance = Math.max(maxSize * 1.8, 3.5);
    camera.position.z = cameraDistance;
    
    // Slight elevation for better view
    camera.position.y = maxSize * 0.2;
    
    camera.lookAt(0, 0, 0);
    
    console.log('Camera positioned at:', {
        x: camera.position.x.toFixed(2),
        y: camera.position.y.toFixed(2),
        z: camera.position.z.toFixed(2)
    });
}

function setupScrollAnimations() {
    if (!model) return;
    
    console.log('Setting up scroll animations for sticky sections...');
    
    // Kill any existing triggers
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    
    // Get total scrollable height
    const totalHeight = document.querySelector('main').scrollHeight;
    const viewportHeight = window.innerHeight;
    
    // Create master timeline for smooth transitions
    const masterTL = gsap.timeline({
        scrollTrigger: {
            trigger: "main",
            start: "top top",
            end: `+=${totalHeight - viewportHeight}`,
            scrub: 0.5,
            pin: false,
            anticipatePin: 1,
            onUpdate: function(self) {
                // Calculate which sticky section should be active
                const sections = [
                    { id: 'hero-sticky-content', range: [0, 0.2] },
                    { id: 'feature1-sticky-content', range: [0.2, 0.4] },
                    { id: 'feature2-sticky-content', range: [0.4, 0.6] },
                    { id: 'feature3-sticky-content', range: [0.6, 0.8] },
                    { id: 'feature4-sticky-content', range: [0.8, 1] }
                ];
                
                sections.forEach(section => {
                    const element = document.getElementById(section.id);
                    if (element) {
                        if (self.progress >= section.range[0] && self.progress < section.range[1]) {
                            element.classList.add('active');
                        } else {
                            element.classList.remove('active');
                        }
                    }
                });
                
                // 3D model animation based on scroll
                if (model) {
                    // Smooth rotation
                    model.rotation.y = self.progress * Math.PI * 2;
                    
                    // Zoom effect
                    const baseZoom = 4;
                    const zoomRange = 2.5;
                    const zoom = baseZoom - (self.progress * zoomRange);
                    camera.position.z = Math.max(zoom, 1.8);
                    
                    // Subtle floating movement
                    model.position.y = Math.sin(self.progress * Math.PI * 2) * 0.2;
                }
            }
        }
    });
    
    console.log('Sticky scroll animations ready');
}

// Add this to your existing init() function
function quickBandingFixes() {
    // 1. Enable dithering
    renderer.dithering = true;
    
    // 2. Better tone mapping
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // 3. Increase shadow map size
    scene.traverse(child => {
        if (child.isLight && child.shadow) {
            child.shadow.mapSize.width = 2048;
            child.shadow.mapSize.height = 2048;
        }
    });
    
    // 4. Add subtle fog to hide distant banding
    scene.fog = new THREE.Fog(0x000000, 15, 30);
    
    // 5. Add noise texture to all materials
    if (model) {
        const noiseTexture = createNoiseTexture();
        model.traverse(child => {
            if (child.isMesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        mat.alphaMap = noiseTexture;
                        mat.alphaTest = 0.01;
                    });
                } else {
                    child.material.alphaMap = noiseTexture;
                    child.material.alphaTest = 0.01;
                }
            }
        });
    }
}

function createNoiseTexture() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    const imageData = ctx.createImageData(size, size);
    const data = imageData.data;
    
    // Create blue noise or simple noise
    for (let i = 0; i < data.length; i += 4) {
        const value = Math.random() * 255;
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
        data[i + 3] = 255;   // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    return new THREE.CanvasTexture(canvas);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Subtle idle rotation when not scrolling
    if (model && isModelLoaded && !ScrollTrigger.isScrolling) {
        model.rotation.y += 0.001; // Slower idle rotation
    }
    
    renderer.render(scene, camera);
}

// UI Helper functions
function updateLoaderMessage(message) {
    const loader = document.getElementById('loader');
    if (loader) {
        const h3 = loader.querySelector('h3');
        if (h3) {
            h3.textContent = message;
        }
    }
}

function updateProgressBar(percent) {
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.style.width = `${percent}%`;
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
        }, 500);
    }
}

function showDemoNotice(message) {
    const demoNotice = document.getElementById('demo-notice');
    if (demoNotice) {
        demoNotice.textContent = message;
        demoNotice.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            demoNotice.style.opacity = '0.5';
            
            // Fade out completely after another 3 seconds
            setTimeout(() => {
                demoNotice.style.display = 'none';
            }, 3000);
        }, 5000);
    }
}

// Manual scaling functions (optional - add controls to HTML if needed)
function scaleModel(factor) {
    if (!model) return;
    
    currentModelScale *= factor;
    model.scale.set(currentModelScale, currentModelScale, currentModelScale);
    
    console.log('Model manually scaled to:', currentModelScale.toFixed(3));
    
    // Re-center after scaling
    centerModel();
}

function resetModelScale() {
    if (!model) return;
    
    currentModelScale = originalModelScale;
    model.scale.set(currentModelScale, currentModelScale, currentModelScale);
    
    console.log('Model scale reset to original:', currentModelScale.toFixed(3));
    
    // Re-center after scaling
    centerModel();
}

// Debug function to check model size
function debugModelSize() {
    if (!model) {
        console.log('No model loaded');
        return;
    }
    
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    
    box.getSize(size);
    box.getCenter(center);
    
    console.log('=== Model Debug Info ===');
    console.log('Position:', model.position);
    console.log('Scale:', model.scale);
    console.log('Dimensions:', {
        width: size.x.toFixed(3),
        height: size.y.toFixed(3),
        depth: size.z.toFixed(3)
    });
    console.log('Center:', center);
    console.log('Camera position:', camera.position);
    console.log('Camera distance from center:', camera.position.length().toFixed(3));
}

// Call debug function on load for troubleshooting
setTimeout(debugModelSize, 2000);