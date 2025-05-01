'use client';

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PlantModel {
    gltf: any;
    density: number;
}

const Field: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!mountRef.current) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(2, 4, 6);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        mountRef.current.appendChild(renderer.domElement);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.maxPolarAngle = Math.PI / 2;
        controls.target.set(0, 0, 0);
        controls.update();

        const textureLoader = new THREE.TextureLoader();
        const exrLoader = new EXRLoader();
        const clock = new THREE.Clock();
        const mixers: THREE.AnimationMixer[] = [];

        const loadTextures = async () => {
            const [
                soilColor,
                soilNormal,
                soilRoughness,
                soilDisplacement,
                grassColor,
                grassNormal,
                grassRoughness
            ] = await Promise.all([
                textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Color.jpg'),
                textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_NormalGL.jpg'),
                textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Roughness.jpg'),
                textureLoader.loadAsync('/textures/soil/Ground0825_2K-JPG_Displacement.jpg'),
                textureLoader.loadAsync('/textures/grass/grass_path_3_diff_4k.jpg'),
                exrLoader.loadAsync('/textures/grass/grass_path_3_nor_gl_4k.exr'),
                textureLoader.loadAsync('/textures/grass/grass_path_3_rough_4k.jpg')
            ]);

            [soilColor, soilNormal, soilRoughness, soilDisplacement, grassColor, grassNormal, grassRoughness].forEach(
                (tex) => {
                    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
                    tex.repeat.set(4, 4);
                }
            );

            return {
                soilColor,
                soilNormal,
                soilRoughness,
                soilDisplacement,
                grassColor,
                grassNormal,
                grassRoughness
            };
        };

        loadTextures().then((textures) => {
            // Ground
            const groundGeometry = new THREE.PlaneGeometry(100, 100, 100, 100);
            const groundMaterial = new THREE.MeshStandardMaterial({
                map: textures.soilColor,
                normalMap: textures.soilNormal,
                roughnessMap: textures.soilRoughness,
                displacementMap: textures.soilDisplacement,
                displacementScale: 0.2
            });

            const positions = groundGeometry.attributes.position.array as Float32Array;

            const rowYPositions = [-10, 0, 10]; // rows in raw geometry BEFORE rotation
            const rowWidth = 3;

            for (let i = 0; i < positions.length; i += 3) {
                const x = positions[i];      // X-axis
                const y = positions[i + 1];  // Y-axis
                const z = positions[i + 3];  // Z-axis (height)

                rowYPositions.forEach((rowY) => {
                    if (Math.abs(y - rowY) < rowWidth) {
                        const bump = 0.3 * Math.exp(-Math.pow((y - rowY) / rowWidth, 2));
                        positions[i + 2] = z + bump;
                    }
                });

                // optional noise:
                positions[i + 2] += (Math.random() - 0.5) * 0.05;
            }


            groundGeometry.computeVertexNormals();

            const ground = new THREE.Mesh(groundGeometry, groundMaterial);
            ground.rotation.x = -Math.PI / 2;
            ground.receiveShadow = true;
            scene.add(ground);

            // Grass
            const grassGeometry = new THREE.PlaneGeometry(3, 3, 16, 16);
            const grassMaterial = new THREE.MeshStandardMaterial({
                map: textures.grassColor,
                normalMap: textures.grassNormal,
                roughnessMap: textures.grassRoughness,
                transparent: true,
                alphaTest: 0.3,
                side: THREE.DoubleSide
            });

            for (let i = 0; i < 200; i++) {
                const grass = new THREE.Mesh(grassGeometry, grassMaterial);
                grass.position.set((Math.random() - 0.5) * 90, 0, (Math.random() - 0.5) * 90);
                grass.rotation.x = -Math.PI / 2;
                grass.rotation.z = Math.random() * Math.PI;
                grass.scale.setScalar(0.8 + Math.random() * 1.2);
                scene.add(grass);
            }

            const plants: PlantModel[] = [];
            const plantTypes = [
                { path: '/models/plants/tomato_plant.glb', scale: 0.05, density: 0.5 }
            ];

            const gltfLoader = new GLTFLoader();
            let loadedCount = 0;

            const tryCreateField = () => {
                loadedCount++;
                setProgress(Math.round((loadedCount / plantTypes.length) * 100));

                if (loadedCount === plantTypes.length) {
                    setLoading(false);
                    createField();
                }
            };

            plantTypes.forEach(({ path, scale, density }) => {
                gltfLoader.load(
                    path,
                    (gltf) => {
                        gltf.scene.scale.set(scale, scale, scale);
                        gltf.scene.traverse((child) => {
                            if ((child as THREE.Mesh).isMesh) {
                                const mesh = child as THREE.Mesh;
                                mesh.castShadow = true;
                                mesh.receiveShadow = true;
                            }
                        });

                        plants.push({
                            gltf,
                            density
                        });

                        tryCreateField();
                    },
                    undefined,
                    (error) => {
                        console.error(`Error loading model ${path}:`, error);
                        tryCreateField();
                    }
                );
            });

            const createField = () => {
                const rows = 3;
                const cols = 5;

                const rowSpacing = 10; // space between rows (z-axis)
                const plantSpacing = 5; // space between plants in a row (x-axis)

                const baseX = -((cols - 1) * plantSpacing) / 2;
                const baseZ = -((rows - 1) * rowSpacing) / 2;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const selectedPlant = plants[0];

                        const instance = selectedPlant.gltf.scene.clone(true);
                        const mixer = new THREE.AnimationMixer(instance);
                        selectedPlant.gltf.animations.forEach((clip: THREE.AnimationClip) =>
                            mixer.clipAction(clip).play()
                        );
                        mixers.push(mixer);

                        const x = baseX + c * plantSpacing;
                        const z = baseZ + r * rowSpacing;
                        instance.position.set(x, 0, z);
                        scene.add(instance);
                    }
                }
            };
        });

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 30, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        scene.add(directionalLight);

        const handleResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            mixers.forEach((mixer) => mixer.update(delta));
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            mountRef.current?.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div>
            {loading && (
                <div
                    style={{
                        position: 'absolute',
                        top: 10,
                        left: 10,
                        background: 'rgba(0,0,0,0.7)',
                        color: '#fff',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        zIndex: 10
                    }}
                >
                    Loading: {progress}%
                </div>
            )}
            <div ref={mountRef} style={{ width: '100vw', height: '100vh' }} />
        </div>
    );
};

export default Field;
