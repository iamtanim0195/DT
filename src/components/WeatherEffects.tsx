'use client';

import * as THREE from 'three';

interface WeatherState {
    conditions: string;
    temperature: number;
    windSpeed: number;
    humidity: number;
    windDirection: number;
}

export class WeatherEffects {
    private scene: THREE.Scene;
    private clouds: THREE.Group | null = null;
    private rainParticles: THREE.Points | null = null;
    private windLines: THREE.LineSegments | null = null;
    private fog: THREE.FogExp2 | null = null;
    private weatherState: WeatherState | null = null;
    private windIndicator: THREE.Group | null = null;
    private windArrow: THREE.Mesh | null = null;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public updateWeather(weather: WeatherState) {
        this.weatherState = weather;
        this.updateEffects();
    }

    private updateEffects() {
        if (!this.weatherState) return;

        this.updateFog();
        this.updateLighting();
        this.updateClouds();
        this.updateRain();
        this.updateWind();
        
        if (this.weatherState.windSpeed > 0) {
            if (!this.windIndicator) {
                this.createWindDirectionIndicator();
            }
            this.updateWindDirection();
        } else if (this.windIndicator) {
            this.scene.remove(this.windIndicator);
            this.windIndicator = null;
            this.windArrow = null;
        }
    }

    private createWindDirectionIndicator() {
        const group = new THREE.Group();
        
        // Compass base
        const compassGeometry = new THREE.CircleGeometry(4, 32);
        const compassMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x222222,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const compass = new THREE.Mesh(compassGeometry, compassMaterial);
        compass.rotation.x = Math.PI / 2;
        compass.position.set(0, 0.1, 0);
        group.add(compass);
        
        // Direction labels
        const createLabel = (text: string, position: THREE.Vector3) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 128;
            const context = canvas.getContext('2d')!;
            context.fillStyle = 'rgba(255, 255, 255, 0.9)';
            context.font = 'Bold 60px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, 128, 64);
            
            const texture = new THREE.CanvasTexture(canvas);
            const material = new THREE.SpriteMaterial({ map: texture });
            const sprite = new THREE.Sprite(material);
            sprite.scale.set(3, 1.5, 1);
            sprite.position.copy(position);
            group.add(sprite);
        };
        
        createLabel('N', new THREE.Vector3(0, 0.1, 4.5));
        createLabel('E', new THREE.Vector3(4.5, 0.1, 0));
        createLabel('S', new THREE.Vector3(0, 0.1, -4.5));
        createLabel('W', new THREE.Vector3(-4.5, 0.1, 0));
        
        // Wind direction arrow
        const arrowShape = new THREE.Shape();
        arrowShape.moveTo(0, 0);
        arrowShape.lineTo(-0.8, 3);
        arrowShape.lineTo(0, 2.6);
        arrowShape.lineTo(0.8, 3);
        arrowShape.lineTo(0, 0);
        
        const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
        const arrowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3333,
            side: THREE.DoubleSide
        });
        this.windArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.windArrow.rotation.x = Math.PI / 2;
        this.windArrow.position.set(0, 0.12, 0);
        group.add(this.windArrow);
        
        // Position in bottom-left corner and flip to face camera
        group.position.set(-40, 0, -40);
        group.rotation.y = Math.PI;
        
        this.scene.add(group);
        this.windIndicator = group;
    }

    private updateWindDirection() {
        if (!this.windArrow || !this.weatherState) return;
        
        const radians = THREE.MathUtils.degToRad(this.weatherState.windDirection - 180);
        this.windArrow.rotation.z = radians;
        
        const scale = 1 + (this.weatherState.windSpeed / 10);
        this.windArrow.scale.set(scale, scale, scale);
    }

    private updateFog() {
        if (this.fog) {
            this.scene.fog = null;
        }
        const fogDensity = 0.001 + (this.weatherState!.humidity / 100) * 0.002;
        this.fog = new THREE.FogExp2(0x87ceeb, fogDensity);
        this.scene.fog = this.fog;
    }

    private updateLighting() {
        const ambientLight = this.scene.children.find(
            child => child instanceof THREE.AmbientLight
        ) as THREE.AmbientLight;
        
        const directionalLight = this.scene.children.find(
            child => child instanceof THREE.DirectionalLight && child.position.y > 20
        ) as THREE.DirectionalLight;
        
        if (ambientLight && directionalLight) {
            if (this.weatherState!.conditions.toLowerCase().includes('rain') || 
                this.weatherState!.conditions.toLowerCase().includes('cloud')) {
                ambientLight.intensity = 0.4;
                directionalLight.intensity = 0.5;
                directionalLight.color.setHex(0xccccff);
            } else {
                ambientLight.intensity = 0.6;
                directionalLight.intensity = 0.8;
                directionalLight.color.setHex(0xfff4e6);
            }
        }
    }

    private updateClouds() {
        if (this.clouds) this.scene.remove(this.clouds);
        
        const cloudCount = this.weatherState!.conditions.toLowerCase().includes('rain') 
            ? 15 + this.weatherState!.windSpeed * 2
            : this.weatherState!.conditions.toLowerCase().includes('cloud')
                ? 10 + this.weatherState!.windSpeed
                : 5;

        const cloudGroup = new THREE.Group();
        const cloudGeometry = new THREE.SphereGeometry(1, 16, 16);
        const cloudMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8,
            roughness: 0.9
        });

        for (let i = 0; i < cloudCount; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            const size = 2 + Math.random() * 3;
            cloud.scale.set(size, size * 0.5, size * 0.5);
            
            cloud.position.set(
                Math.random() * 100 - 50,
                10 + Math.random() * 10,
                Math.random() * 100 - 50
            );
            
            cloud.scale.x += Math.random() * 2;
            cloud.scale.y += Math.random() * 1;
            cloud.scale.z += Math.random() * 2;
            
            cloudGroup.add(cloud);
        }

        this.scene.add(cloudGroup);
        this.clouds = cloudGroup;
    }

    private updateRain() {
        if (this.rainParticles) {
            this.scene.remove(this.rainParticles);
            this.rainParticles = null;
        }

        if (!this.weatherState!.conditions.toLowerCase().includes('rain')) return;

        const particleCount = Math.floor(5000 * (this.weatherState!.humidity / 100));
        const particles = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = Math.random() * 100 - 50;
            positions[i * 3 + 1] = Math.random() * 50;
            positions[i * 3 + 2] = Math.random() * 100 - 50;
        }
        
        particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: 0.1,
            transparent: true,
            opacity: 0.8
        });
        
        const rain = new THREE.Points(particles, particleMaterial);
        this.scene.add(rain);
        this.rainParticles = rain;
    }

    private updateWind() {
        if (this.windLines) {
            this.scene.remove(this.windLines);
            this.windLines = null;
        }

        if (this.weatherState!.windSpeed <= 3) return;

        const lineCount = 50;
        const lineGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(lineCount * 6);
        
        for (let i = 0; i < lineCount; i++) {
            const x = Math.random() * 100 - 50;
            const y = 0.5 + Math.random() * 2;
            const z = Math.random() * 100 - 50;
            
            positions[i * 6] = x;
            positions[i * 6 + 1] = y;
            positions[i * 6 + 2] = z;
            
            positions[i * 6 + 3] = x - this.weatherState!.windSpeed * (0.5 + Math.random());
            positions[i * 6 + 4] = y - this.weatherState!.windSpeed * 0.2 * Math.random();
            positions[i * 6 + 5] = z + this.weatherState!.windSpeed * (0.5 - Math.random());
        }
        
        lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.3
        });
        
        const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
        this.scene.add(lines);
        this.windLines = lines;
    }

    public animate(delta: number) {
        if (this.clouds && this.weatherState) {
            this.clouds.position.x += this.weatherState.windSpeed * delta * 0.05;
            if (this.clouds.position.x > 60) this.clouds.position.x = -60;
        }

        if (this.rainParticles && this.weatherState) {
            const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] -= 10 * delta;
                if (positions[i + 1] < 0) {
                    positions[i + 1] = 20 + Math.random() * 30;
                    positions[i] = Math.random() * 100 - 50;
                    positions[i + 2] = Math.random() * 100 - 50;
                }
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }

        if (this.windLines && this.weatherState) {
            const positions = this.windLines.geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < positions.length; i += 6) {
                positions[i] -= this.weatherState.windSpeed * delta * 0.2;
                positions[i + 3] -= this.weatherState.windSpeed * delta * 0.2;
                
                if (positions[i] < -60) {
                    const x = 60;
                    const y = 0.5 + Math.random() * 2;
                    const z = Math.random() * 100 - 50;
                    
                    positions[i] = x;
                    positions[i + 1] = y;
                    positions[i + 2] = z;
                    
                    positions[i + 3] = x - this.weatherState.windSpeed * (0.5 + Math.random());
                    positions[i + 4] = y - this.weatherState.windSpeed * 0.2 * Math.random();
                    positions[i + 5] = z + this.weatherState.windSpeed * (0.5 - Math.random());
                }
            }
            this.windLines.geometry.attributes.position.needsUpdate = true;
        }
    }

    public dispose() {
        if (this.clouds) this.scene.remove(this.clouds);
        if (this.rainParticles) this.scene.remove(this.rainParticles);
        if (this.windLines) this.scene.remove(this.windLines);
        if (this.fog) this.scene.fog = null;
        if (this.windIndicator) this.scene.remove(this.windIndicator);
    }
}