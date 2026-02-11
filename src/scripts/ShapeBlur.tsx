import { useRef, useEffect } from 'react';
import * as THREE from 'three';

const vertexShader = /* glsl */ `
varying vec2 v_texcoord;
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_texcoord = uv;
}
`;

const fragmentShader = /* glsl */ `
varying vec2 v_texcoord;

uniform vec2 u_mouse;
uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform float u_roundness;
uniform float u_borderSize;
uniform float u_circleSize;
uniform float u_circleEdge;
uniform vec3 u_color;

#ifndef PI
#define PI 3.1415926535897932384626433832795
#endif
#ifndef TWO_PI
#define TWO_PI 6.2831853071795864769252867665590
#endif

vec2 coord(in vec2 p) {
    p = p / u_resolution.xy;
    p -= 0.5;
    p *= vec2(-1.0, 1.0);
    return p;
}

#define st0 coord(gl_FragCoord.xy)
#define mx coord(u_mouse * u_pixelRatio)

float sdRoundRect(vec2 p, vec2 b, float r) {
    vec2 d = abs(p - 0.5) * 2.0 - b + vec2(r);
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - r;
}

float sdCircle(in vec2 st, in vec2 center) {
    return length(st - center) * 2.0;
}

float fill(float x, float size, float edge) {
    return 1.0 - smoothstep(size - edge, size + edge, x);
}

float strokeAA(float x, float size, float w, float edge) {
    float afwidth = length(vec2(dFdx(x), dFdy(x))) * 0.70710678;
    float d = smoothstep(size - edge - afwidth, size + edge + afwidth, x + w * 0.5)
            - smoothstep(size - edge - afwidth, size + edge + afwidth, x - w * 0.5);
    return clamp(d, 0.0, 1.0);
}

void main() {
    vec2 st = st0 + 0.5;
    vec2 posMouse = mx * vec2(1., -1.) + 0.5;

    // Mouse blur circle effect
    float sdfCircle = fill(
        sdCircle(st, posMouse),
        u_circleSize,
        u_circleEdge
    );

    // Create the rounded rectangle
    float sdf = sdRoundRect(st, vec2(0.95, 0.95), u_roundness);
    
    // Create the stroke with mouse interaction
    float stroke = strokeAA(sdf, 0.0, u_borderSize, sdfCircle);
    
    float alpha = stroke * 4.0;
    
    gl_FragColor = vec4(u_color, alpha);
}
`;

const ShapeBlur = ({
  className = '',
  variation = 0,
  pixelRatioProp = 2,
  shapeSize = 1.7,
  roundness = 0.4,
  borderSize = 0.012,
  circleSize = 0.25,
  circleEdge = 1
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let animationFrameId: number;
    let time = 0, lastTime = 0;

    const vMouse = new THREE.Vector2();
    const vMouseDamp = new THREE.Vector2();
    const vResolution = new THREE.Vector2();
    const vColor = new THREE.Vector3(1.0, 1.0, 1.0); // Blanco por defecto

    let w = 1, h = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera();
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    
    canvasRef.current = renderer.domElement;
    mount.appendChild(renderer.domElement);

    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';

    const geo = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_mouse: { value: vMouseDamp },
        u_resolution: { value: vResolution },
        u_pixelRatio: { value: pixelRatioProp },
        u_shapeSize: { value: shapeSize },
        u_roundness: { value: roundness },
        u_borderSize: { value: borderSize },
        u_circleSize: { value: circleSize },
        u_circleEdge: { value: circleEdge },
        u_color: { value: vColor }
      },
      defines: { VAR: variation },
      transparent: true
    });

    const quad = new THREE.Mesh(geo, material);
    scene.add(quad);

    // Función para actualizar el color según el tema
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      // Si tiene clase 'dark' (light mode), usar negro, sino blanco
      if (isDark) {
        vColor.set(0.0, 0.0, 0.0); // Negro para light mode
      } else {
        vColor.set(1.0, 1.0, 1.0); // Blanco para dark mode
      }
      material.uniforms.u_color.value = vColor;
    };

    // Inicializar el tema
    updateTheme();

    // Observer para detectar cambios en el atributo class del html
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      if (!mount) return;
      const rect = mount.getBoundingClientRect();
      vMouse.set(e.clientX - rect.left, e.clientY - rect.top);
    };

    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('pointermove', onPointerMove);

    const resize = () => {
      const container = mountRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      
      const dpr = Math.min(window.devicePixelRatio, 2);

      renderer.setSize(w, h);
      renderer.setPixelRatio(dpr);

      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();

      quad.scale.set(w * 1.2, h * 1.2, 1); // antes estaba w, h
      vResolution.set(w, h).multiplyScalar(dpr);
      material.uniforms.u_pixelRatio.value = dpr;
    };

    resize();
    window.addEventListener('resize', resize);
    const ro = new ResizeObserver(() => resize());
    ro.observe(mount);

    const update = () => {
      time = performance.now() * 0.001;
      const dt = time - lastTime;
      lastTime = time;
      vMouseDamp.x = THREE.MathUtils.damp(vMouseDamp.x, vMouse.x, 8, dt);
      vMouseDamp.y = THREE.MathUtils.damp(vMouseDamp.y, vMouse.y, 8, dt);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(update);
    };
    update();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      ro.disconnect();
      observer.disconnect();
      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('pointermove', onPointerMove);
      
      if (canvasRef.current && mount.contains(canvasRef.current)) {
        mount.removeChild(canvasRef.current);
      }
      renderer.dispose();
      geo.dispose();
      material.dispose();
    };
  }, [variation, pixelRatioProp, shapeSize, roundness, borderSize, circleSize, circleEdge]);

  return (
    <div 
      className={className} 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100%'
      }} 
    />
  );
};

export default ShapeBlur;