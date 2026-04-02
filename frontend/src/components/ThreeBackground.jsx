import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const NODE_COUNT = 180;
const LINK_COUNT = 220;
const BOUNDS = 180;

const randomBetween = (min, max) => Math.random() * (max - min) + min;

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
        const container = mountRef.current;
        if (!container) return undefined;

        let animationFrameId;
        let renderer;
        const cleanupTasks = [];

        try {
            const scene = new THREE.Scene();

            const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 330;

            renderer = new THREE.WebGLRenderer({
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance',
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setClearColor(0x000000, 0);
            container.appendChild(renderer.domElement);

            const positions = new Float32Array(NODE_COUNT * 3);
            const velocities = new Float32Array(NODE_COUNT * 3);
            const colors = new Float32Array(NODE_COUNT * 3);

            const primary = new THREE.Color('#22d3ee');
            const secondary = new THREE.Color('#38bdf8');
            const tertiary = new THREE.Color('#f43f5e');

            for (let i = 0; i < NODE_COUNT; i++) {
                const x = randomBetween(-BOUNDS, BOUNDS);
                const y = randomBetween(-BOUNDS, BOUNDS);
                const z = randomBetween(-BOUNDS, BOUNDS);

                positions[i * 3] = x;
                positions[i * 3 + 1] = y;
                positions[i * 3 + 2] = z;

                velocities[i * 3] = randomBetween(-0.22, 0.22);
                velocities[i * 3 + 1] = randomBetween(-0.22, 0.22);
                velocities[i * 3 + 2] = randomBetween(-0.22, 0.22);

                const colorSeed = Math.random();
                const color = colorSeed > 0.9 ? tertiary : colorSeed > 0.5 ? secondary : primary;
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }

            const nodeGeometry = new THREE.BufferGeometry();
            nodeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            nodeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const nodeMaterial = new THREE.PointsMaterial({
                size: 2.2,
                vertexColors: true,
                transparent: true,
                opacity: 0.85,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            const nodes = new THREE.Points(nodeGeometry, nodeMaterial);

            const linkPairs = Array.from({ length: LINK_COUNT }, () => [
                Math.floor(Math.random() * NODE_COUNT),
                Math.floor(Math.random() * NODE_COUNT),
            ]).filter(([a, b]) => a !== b);

            const linkGeometry = new THREE.BufferGeometry();
            const linkPositions = new Float32Array(linkPairs.length * 6);
            linkGeometry.setAttribute('position', new THREE.BufferAttribute(linkPositions, 3));

            const linkMaterial = new THREE.LineBasicMaterial({
                color: '#38bdf8',
                transparent: true,
                opacity: 0.14,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            const links = new THREE.LineSegments(linkGeometry, linkMaterial);

            const cluster = new THREE.Group();
            cluster.add(nodes);
            cluster.add(links);
            scene.add(cluster);

            const updateLinks = () => {
                const nodePositions = nodeGeometry.attributes.position.array;
                for (let i = 0; i < linkPairs.length; i++) {
                    const [a, b] = linkPairs[i];

                    linkPositions[i * 6] = nodePositions[a * 3];
                    linkPositions[i * 6 + 1] = nodePositions[a * 3 + 1];
                    linkPositions[i * 6 + 2] = nodePositions[a * 3 + 2];

                    linkPositions[i * 6 + 3] = nodePositions[b * 3];
                    linkPositions[i * 6 + 4] = nodePositions[b * 3 + 1];
                    linkPositions[i * 6 + 5] = nodePositions[b * 3 + 2];
                }

                linkGeometry.attributes.position.needsUpdate = true;
            };

            updateLinks();

            const onWindowResize = () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            };

            window.addEventListener('resize', onWindowResize);
            cleanupTasks.push(() => window.removeEventListener('resize', onWindowResize));

            const clock = new THREE.Clock();

            const animate = () => {
                animationFrameId = requestAnimationFrame(animate);
                const elapsed = clock.getElapsedTime();

                const nodePositions = nodeGeometry.attributes.position.array;

                for (let i = 0; i < NODE_COUNT; i++) {
                    const index = i * 3;
                    nodePositions[index] += velocities[index];
                    nodePositions[index + 1] += velocities[index + 1];
                    nodePositions[index + 2] += velocities[index + 2];

                    if (Math.abs(nodePositions[index]) > BOUNDS) velocities[index] *= -1;
                    if (Math.abs(nodePositions[index + 1]) > BOUNDS) velocities[index + 1] *= -1;
                    if (Math.abs(nodePositions[index + 2]) > BOUNDS) velocities[index + 2] *= -1;
                }

                nodeGeometry.attributes.position.needsUpdate = true;

                if (Math.floor(elapsed * 30) % 2 === 0) {
                    updateLinks();
                }

                cluster.rotation.y = elapsed * 0.05;
                cluster.rotation.x = Math.sin(elapsed * 0.25) * 0.08;

                renderer.render(scene, camera);
            };

            animate();

            cleanupTasks.push(() => {
                nodeGeometry.dispose();
                nodeMaterial.dispose();
                linkGeometry.dispose();
                linkMaterial.dispose();

                if (container.contains(renderer.domElement)) {
                    container.removeChild(renderer.domElement);
                }
            });
        } catch (error) {
            console.warn('ThreeBackground disabled:', error);
        }

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
            cleanupTasks.forEach((cleanup) => cleanup());
            if (renderer) {
                renderer.dispose();
            }
        };
  }, []);

  return (
        <div
            ref={mountRef}
            className="fixed inset-0 z-0 pointer-events-none opacity-35"
            aria-hidden="true"
        />
  );
}