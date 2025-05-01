'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Weather from './Weather';

interface PlantModel {
    gltf: THREE.Group;
    density: number;
    scale: number;
    animations: THREE.AnimationClip[];
}

interface TextureMaps {
    soilColor: THREE.Texture;
    soilNormal: THREE.Texture;
    soilRoughness: THREE.Texture;
    soilDisplacement: THREE.Texture;
    grassColor: THREE.Texture;
    grassNormal: THREE.Texture;
    grassRoughness: THREE.Texture;
}

const Field: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);
    const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('Loading assets...');

    const cleanupScene = useCallback((renderer: THREE.WebGLRenderer | null) => {
        if (renderer && mountRef.current) {
            mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
        }
    }, []);

    useEffect(() => {
        // Get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCoordinates({
                        lat: position.coords.latitude,
                        lon: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    setCoordinates({ lat: 51.5074, lon: -0.1278 }); // London as fallback
                }
            );
        } else {
            setCoordinates({ lat: 51.5074, lon: -0.1278 }); // London as fallback
        }

        if (!mountRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(25, 10, 8);
        camera.lookAt(0, 0, 0);

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mountRef.current.appendChild(renderer.domElement);

        // Controls setup
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 0, 0);
        controls.update();

        // Loaders setup
        const loadingManager = new THREE.LoadingManager();
        loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            setProgress(Math.round((itemsLoaded / itemsTotal) * 100));
        };

        const textureLoader = new THREE.TextureLoader(loadingManager);
        const exrLoader = new EXRLoader(loadingManager);
        const gltfLoader = new GLTFLoader(loadingManager);
        const clock = new THREE.Clock();
        const mixers: THREE.AnimationMixer[] = [];

        // Load textures
        const loadTextures = async (): Promise<TextureMaps> => {
            try {
                setLoadingMessage('Loading textures...');

                const texturePromises = [
                    textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Color.jpg'),
                    textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_NormalGL.jpg'),
                    textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Roughness.jpg'),
                    textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Displacement.jpg'),
                    textureLoader.loadAsync('/textures/grass/grass_path_3_diff_4k.jpg'),
                    exrLoader.loadAsync('/textures/grass/grass_path_3_nor_gl_4k.exr'),
                    textureLoader.loadAsync('/textures/grass/grass_path_3_rough_4k.jpg')
                ];

                const [
                    soilColor,
                    soilNormal,
                    soilRoughness,
                    soilDisplacement,
                    grassColor,
                    grassNormal,
                    grassRoughness
                ] = await Promise.all(texturePromises);

                const textures = [soilColor, soilNormal, soilRoughness, soilDisplacement, grassColor, grassNormal, grassRoughness];
                textures.forEach(tex => {
                    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                    tex.repeat.set(4, 4);
                    if (tex !== grassNormal) {
                        tex.colorSpace = THREE.SRGBColorSpace;
                    }
                });

                return {
                    soilColor,
                    soilNormal,
                    soilRoughness,
                    soilDisplacement,
                    grassColor,
                    grassNormal,
                    grassRoughness
                };
            } catch (error) {
                console.error('Failed to load textures:', error);
                throw error;
            }
        };

        // Create terrain
        const createTerrain = (textures: TextureMaps) => {
            setLoadingMessage('Creating terrain...');

            const groundGeometry = new THREE.PlaneGeometry(100, 100, 100, 100);
            const groundMaterial = new THREE.MeshStandardMaterial({
                map: textures.soilColor,
                normalMap: textures.soilNormal,
                roughnessMap: textures.soilRoughness,
                displacementMap: textures.soilDisplacement,
                displacementScale: 0.2
            });

            const positions = groundGeometry.attributes.position.array as Float32Array;
            const rowYPositions = [-10, 0, 10];
            const rowWidth = 3;

            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];
                const y = positions[i + 1];

                rowYPositions.forEach(rowY => {
                    if (Math.abs(y - rowY) < rowWidth) {
                        const distance = (y - rowY) / rowWidth;
                        const bump = 0.3 * Math.exp(-Math.pow(distance, 4));
                        positions[i + 2] += bump;
                    }
                });

                const noiseValue = 0.05 * (
                    Math.sin(x * 0.1) * Math.cos(y * 0.1) +
                    0.03 * Math.sin(x * 0.3) * Math.cos(y * 0.3)
                );
                positions[i + 2] += noiseValue;
            }

            groundGeometry.computeVertexNormals();
            groundGeometry.attributes.position.needsUpdate = true;
            groundGeometry.attributes.normal.needsUpdate = true;

            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            return ground;
        };

        // Create grass
        const createGrass = (textures: TextureMaps) => {
            setLoadingMessage('Creating grass...');

            const grassGeometry = new THREE.PlaneGeometry(3, 3, 16, 16);
            const grassMaterial = new THREE.MeshStandardMaterial({
                map: textures.grassColor,
                normalMap: textures.grassNormal,
                roughnessMap: textures.grassRoughness,
                transparent: true,
                alphaTest: 0.3,
                side: THREE.DoubleSide
            });

            const grassGroup = new THREE.Group();
            scene.add(grassGroup);

            for (let i = 0; i < 200; i++) {
                const grass = new THREE.Mesh(grassGeometry, grassMaterial);
                const angle = Math.random() * Math.PI * 2;
                const radius = Math.sqrt(Math.random()) * 45;

                grass.position.set(
                    radius * Math.cos(angle),
                    0,
                    radius * Math.sin(angle)
                );

                grass.rotation.x = -Math.PI / 2;
                grass.rotation.z = Math.random() * Math.PI;
                grass.scale.setScalar(0.8 + Math.random() * 1.2);
                grassGroup.add(grass);
            }

            return grassGroup;
        };

        // Load plant models
        const loadPlantModels = async (): Promise<PlantModel[]> => {
            setLoadingMessage('Loading plants...');

            const plantTypes = [
                {
                    path: '/models/plants/tomato_plant.glb',
                    scale: 0.05,
                    density: 0.5,
                    name: 'Tomato'
                }
            ];

            const loadPromises = plantTypes.map((plant) =>
                gltfLoader.loadAsync(plant.path)
                    .then(gltf => {
                        gltf.scene.scale.set(plant.scale, plant.scale, plant.scale);
                        gltf.scene.traverse(child => {
                            if ((child as THREE.Mesh).isMesh) {
                                const mesh = child as THREE.Mesh;
                                mesh.castShadow = true;
                                mesh.receiveShadow = true;

                                if (mesh.material instanceof THREE.MeshStandardMaterial) {
                                    mesh.material.roughness = 0.8;
                                    mesh.material.metalness = 0.2;
                                }
                            }
                        });

                        return {
                            gltf: gltf.scene,
                            density: plant.density,
                            scale: plant.scale,
                            animations: gltf.animations,
                            name: plant.name
                        };
                    })
                    .catch(error => {
                        console.error(`Error loading model ${plant.path}:`, error);
                        return null;
                    })
            );

            const results = await Promise.all(loadPromises);
            return results.filter(Boolean) as PlantModel[];
        };

        // Create plant field
        const createPlantField = (plants: PlantModel[]) => {
            if (plants.length === 0) return;

            setLoadingMessage('Planting crops...');

            const fieldGroup = new THREE.Group();
            scene.add(fieldGroup);

            const rows = 3;
            const cols = 5;
            const rowSpacing = 10;
            const plantSpacing = 5;
            const baseX = -((cols - 1) * plantSpacing) / 2;
            const baseZ = -((rows - 1) * rowSpacing) / 2;

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const selectedPlant = plants[0];
                    const instance = selectedPlant.gltf.clone(true);
                    const mixer = new THREE.AnimationMixer(instance);

                    selectedPlant.animations.forEach(clip => {
                        mixer.clipAction(clip).play();
                    });

                    mixers.push(mixer);

                    const x = baseX + c * plantSpacing + (Math.random() - 0.5) * 0.5;
                    const z = baseZ + r * rowSpacing + (Math.random() - 0.5) * 0.5;

                    instance.position.set(x, 0, z);
                    fieldGroup.add(instance);
                }
            }
        };

        // Setup lighting
        const setupLighting = () => {
            // Ambient light
            const ambient = new THREE.AmbientLight(0xffffff, 0.6);
            scene.add(ambient);

            // Main directional light (sun)
            const directionalLight = new THREE.DirectionalLight(0xfff4e6, 0.8);
            directionalLight.position.set(20, 30, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 100;
            directionalLight.shadow.camera.left = -30;
            directionalLight.shadow.camera.right = 30;
            directionalLight.shadow.camera.top = 30;
            directionalLight.shadow.camera.bottom = -30;
            directionalLight.shadow.bias = -0.001;
            scene.add(directionalLight);

            // Fill light
            const fillLight = new THREE.DirectionalLight(0xccf0ff, 0.3);
            fillLight.position.set(-10, 20, -5);
            scene.add(fillLight);
        };

        // Main initialization
        const initializeScene = async () => {
            try {
                setupLighting();

                const textures = await loadTextures();
                createTerrain(textures);
                createGrass(textures);

                const plants = await loadPlantModels();
                createPlantField(plants);

                setLoading(false);
            } catch (error) {
                console.error('Scene initialization failed:', error);
                setLoadingMessage('Failed to load. Please refresh.');
            }
        };

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            const delta = clock.getDelta();
            mixers.forEach(mixer => mixer.update(delta));

            controls.update();
            renderer.render(scene, camera);
        };

        // Handle window resize
        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        initializeScene();
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            cleanupScene(renderer);

            scene.traverse(object => {
                if ((object as THREE.Mesh).isMesh) {
                    const mesh = object as THREE.Mesh;
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) {
                        if (Array.isArray(mesh.material)) {
                            mesh.material.forEach(m => m.dispose());
                        } else {
                            mesh.material.dispose();
                        }
                    }
                }
            });
        };
    }, [cleanupScene]);

    return (
        <div className="relative w-full h-screen">
            {loading && (
                <div className="absolute top-3 left-3 z-10 px-3 py-2 text-white bg-black bg-opacity-70 rounded-lg">
                    {loadingMessage}: {progress}%
                </div>
            )}

            {coordinates && (
                <div className="absolute top-5 right-5 z-10">
                    <Weather lat={coordinates.lat} lon={coordinates.lon} />
                </div>
            )}

            <div ref={mountRef} className="w-full h-full" />
        </div>
    );
};

export default Field;