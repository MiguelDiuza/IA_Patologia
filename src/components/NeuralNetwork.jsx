"use client";
import React, { useEffect, useRef } from 'react';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import * as THREE from 'three';

export default function NeuralNetwork() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    // [CÁMARA / TAMAÑO GLOBAL]: Aleja o acerca la cámara (z) para afectar el tamaño percibido de toda la red
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 30);

    // [POSICIÓN]: Modifica Y para subir o bajar la red. Valores más negativos la bajan más.
    scene.position.y = -42;
    // scene.position.x = 0; // También podrías moverla de lado a lado

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      2.0,
      0.4,
      0.75
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const pulseUniforms = {
      uTime: { value: 0.0 },
      uPulsePositions: { value: [new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3), new THREE.Vector3(1e3, 1e3, 1e3)] },
      uPulseTimes: { value: [-1e3, -1e3, -1e3] },
      uPulseColors: { value: [new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1)] },
      uPulseSpeed: { value: 18.0 },
      uBaseNodeSize: { value: 0.0 } // [ANIMACIÓN]: Inicia en 0 para aparecer gradualmente
    };

    const noiseFunctions = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }`;

    const nodeShader = {
      vertexShader: `${noiseFunctions}
      attribute float nodeSize;
      attribute vec3 nodeColor;
      attribute float distanceFromRoot;
      uniform float uTime;
      uniform vec3 uPulsePositions[3];
      uniform float uPulseTimes[3];
      uniform float uPulseSpeed;
      uniform float uBaseNodeSize;
      varying vec3 vColor;
      varying float vPulseIntensity;
      varying float vDistanceFromRoot;
      float getPulseIntensity(vec3 worldPos, vec3 pulsePos, float pulseTime) {
          if (pulseTime < 0.0) return 0.0;
          float timeSinceClick = uTime - pulseTime;
          if (timeSinceClick < 0.0 || timeSinceClick > 4.0) return 0.0;
          float pulseRadius = timeSinceClick * uPulseSpeed;
          float distToClick = distance(worldPos, pulsePos);
          return smoothstep(3.0, 0.0, abs(distToClick - pulseRadius)) * smoothstep(4.0, 0.0, timeSinceClick);
      }
      void main() {
          vColor = nodeColor;
          vDistanceFromRoot = distanceFromRoot;
          vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          float totalPulseIntensity = 0.0;
          for (int i = 0; i < 3; i++) totalPulseIntensity += getPulseIntensity(worldPos, uPulsePositions[i], uPulseTimes[i]);
          vPulseIntensity = min(totalPulseIntensity, 1.0);
          
          // [ANIMACIÓN / MORPH]: Este cálculo con "sin" genera el efecto de "respirar" de la red y altera su forma/inflado dinámicamente
          float breathe = sin(uTime * 0.7 + distanceFromRoot * 0.15) * 0.15 + 0.85;
          float baseSize = nodeSize * breathe;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = baseSize * (1.0 + vPulseIntensity * 3.0) * uBaseNodeSize * (800.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
      }`,
      fragmentShader: `
      uniform float uTime;
      varying vec3 vColor;
      varying float vPulseIntensity;
      varying float vDistanceFromRoot;
      void main() {
          float dist = length(2.0 * gl_PointCoord - 1.0);
          if (dist > 1.0) discard;
          float glow = pow(1.0 - dist, 1.5);
          vec3 finalColor = vColor * (0.9 + 0.1 * sin(uTime * 0.6 + vDistanceFromRoot * 0.25));
          if (vPulseIntensity > 0.0) finalColor = mix(finalColor, vec3(1.0), vPulseIntensity * 0.9);
          gl_FragColor = vec4(finalColor, glow * 0.9);
      }`
    };

    const connectionShader = {
      vertexShader: `${noiseFunctions}
      attribute vec3 startPoint;
      attribute vec3 endPoint;
      attribute float connectionStrength;
      attribute vec3 connectionColor;
      uniform float uTime;
      varying vec3 vColor;
      varying float vConnectionStrength;
      void main() {
          float t = position.x;
          vec3 finalPos = mix(startPoint, endPoint, t);
          vColor = connectionColor;
          vConnectionStrength = connectionStrength;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPos, 1.0);
      }`,
      fragmentShader: `
      uniform float uTime;
      varying vec3 vColor;
      varying float vConnectionStrength;
      void main() {
          float flow = sin(uTime * 2.5 - vConnectionStrength * 10.0) * 0.5 + 0.5;
          
          // [LÍNEAS DE CONEXIÓN]: El "vColor * 3.0" hace que los colores sean puros para activar el efecto Glow de ThreeJS intensamente!
          gl_FragColor = vec4(vColor * 3.0, vConnectionStrength * (0.5 + flow * 0.7));
      }`
    };

    class Node {
      constructor(position, level = 0) {
        this.position = position;
        this.connections = [];
        this.level = level;
        this.size = THREE.MathUtils.randFloat(0.5, 1.2);
        this.distanceFromRoot = position.length();
      }
      addConnection(node, strength = 1.0) {
        this.connections.push({ node, strength });
      }
    }

    function generateNetwork() {
      const nodes = [];
      const root = new Node(new THREE.Vector3(0, 0, 0), 0);
      nodes.push(root);

      // [DENSIDAD - CAPAS]: Cuántas capas expansivas tiene la red (un número mayor = una red más masiva y extensa)
      const layers = 12;
      for (let l = 1; l <= layers; l++) {

        // [DENSIDAD - NODOS]: Multiplicador de nodos por capa. (l * 35) aumenta la densidad de la silueta esférica.
        const count = l * 55;
        for (let i = 0; i < count; i++) {
          const phi = Math.acos(1 - 2 * (i + 0.5) / count);
          const theta = 2 * Math.PI * i * 1.618033;

          // [FORMA / EXPANSIÓN]: El "4.5" determina la separación entre las capas. Si lo achicas, la red se ve más compacta.
          const pos = new THREE.Vector3(l * 4.5, 0, 0).applyEuler(new THREE.Euler(phi, theta, 0));
          const node = new Node(pos, l);
          nodes.push(node);
          const prevLayerNodes = nodes.filter(n => n.level === l - 1);
          const nearestNodes = prevLayerNodes.sort((a, b) => pos.distanceTo(a.position) - pos.distanceTo(b.position));
          if (nearestNodes[0]) nearestNodes[0].addConnection(node, 0.9);
          if (nearestNodes[1]) nearestNodes[1].addConnection(node, 0.6); // add secondary connection for density
        }
      }
      return nodes;
    }

    const networkNodes = generateNetwork();
    const colorPalettes = [[new THREE.Color(0x667eea), new THREE.Color(0x764ba2), new THREE.Color(0xf093fb), new THREE.Color(0x9d50bb), new THREE.Color(0x667eea)]];
    const palette = colorPalettes[0];

    const nodesGeo = new THREE.BufferGeometry();
    const pos = [], sizes = [], colors = [], dists = [];
    networkNodes.forEach(n => {
      pos.push(n.position.x, n.position.y, n.position.z);
      sizes.push(n.size);
      dists.push(n.distanceFromRoot);
      const c = palette[n.level % palette.length];
      colors.push(c.r, c.g, c.b);
    });
    nodesGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    nodesGeo.setAttribute('nodeSize', new THREE.Float32BufferAttribute(sizes, 1));
    nodesGeo.setAttribute('nodeColor', new THREE.Float32BufferAttribute(colors, 3));
    nodesGeo.setAttribute('distanceFromRoot', new THREE.Float32BufferAttribute(dists, 1));
    const nodesMat = new THREE.ShaderMaterial({
      uniforms: pulseUniforms, vertexShader: nodeShader.vertexShader, fragmentShader: nodeShader.fragmentShader,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    scene.add(new THREE.Points(nodesGeo, nodesMat));

    const linesPos = [], lineColors = [];
    networkNodes.forEach(n => {
      n.connections.forEach(conn => {
        const c = palette[n.level % palette.length];

        // Manual Dash: Creamos la línea segmentada calculándola a mano.
        // Esto es 100% a prueba de errores de ThreeJS y muy optimizado.
        const dashCount = 6;
        for (let i = 0; i < dashCount; i++) {
          const tStart = i / dashCount;
          // El 0.4 controla el grosor/largo del segmento iluminado (0.4 significa 40% barra, 60% espacio)
          const tEnd = (i + 0.4) / dashCount;

          const p1x = n.position.x + (conn.node.position.x - n.position.x) * tStart;
          const p1y = n.position.y + (conn.node.position.y - n.position.y) * tStart;
          const p1z = n.position.z + (conn.node.position.z - n.position.z) * tStart;

          const p2x = n.position.x + (conn.node.position.x - n.position.x) * tEnd;
          const p2y = n.position.y + (conn.node.position.y - n.position.y) * tEnd;
          const p2z = n.position.z + (conn.node.position.z - n.position.z) * tEnd;

          // Vértice 1
          linesPos.push(p1x, p1y, p1z);
          lineColors.push(c.r * 1.5, c.g * 1.5, c.b * 1.5);

          // Vértice 2
          linesPos.push(p2x, p2y, p2z);
          lineColors.push(c.r * 1.5, c.g * 1.5, c.b * 1.5);
        }
      });
    });

    const connGeo = new THREE.BufferGeometry();
    connGeo.setAttribute('position', new THREE.Float32BufferAttribute(linesPos, 3));
    connGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    // Usamos el material básico que nunca falla y lo ponemos súper sutil y delgado
    const connMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.0, // [ANIMACIÓN]: Inicia en 0 para aparecer gradualmente
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    scene.add(new THREE.LineSegments(connGeo, connMat));

    const clock = new THREE.Clock();
    let lastPulseIndex = 0;
    
    // [ANIMACIÓN DE ENTRADA]: El factor "grow" controla la aparición gradual de la red
    let growFactor = 0;

    const triggerAutoPulse = () => {
      const time = clock.getElapsedTime();
      lastPulseIndex = (lastPulseIndex + 1) % 3;
      const randomPos = new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20);
      pulseUniforms.uPulsePositions.value[lastPulseIndex].copy(randomPos);
      pulseUniforms.uPulseTimes.value[lastPulseIndex] = time;
      pulseUniforms.uPulseColors.value[lastPulseIndex].copy(palette[Math.floor(Math.random() * palette.length)]);
    };

    const pulseInterval = setInterval(triggerAutoPulse, 4000);

    const animate = () => {
      const t = clock.getElapsedTime();
      
      // Interpolamos el growFactor suavemente hasta 1
      if (growFactor < 1) {
        growFactor += 0.005; // Ajusta la velocidad de "armado" aquí (aprox 3 segundos)
        
        // Aplicamos un easing OutCubic para que se sienta más premium
        const ease = 1 - Math.pow(1 - growFactor, 3);
        
        // Aplicamos el grow al tamaño base de los nodos (el final será 0.6)
        pulseUniforms.uBaseNodeSize.value = ease * 0.6;
        
        // Aplicamos el grow a la opacidad de las conexiones (el final será 0.15)
        connMat.opacity = ease * 0.15;
      } else {
        growFactor = 1;
        pulseUniforms.uBaseNodeSize.value = 0.6;
        connMat.opacity = 0.15;
      }

      pulseUniforms.uTime.value = t;
      controls.update();
      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(pulseInterval);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
      style={{
        zIndex: 0,
        maskImage: 'radial-gradient(circle at center, black 10%, transparent 90%)',
        WebkitMaskImage: 'radial-gradient(circle at center, black 10%, transparent 90%)'
      }}
    />
  );
}
