// the 3d hero orbit. loaded on its own after the first paint, never in lite mode

import {
  CanvasTexture,
  Euler,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { EDGE, FACES, FAR_OPACITY, FILL, INK, SLOTS, layout, nearness, place, type Face, type Layout } from './orbit';

export interface Orbit {
  stop(): void;
}

// card art is drawn once per logo, with clear space round it so the blurred copies have room to spread
const CARD_W = 256;
const CARD_H = CARD_W * 1.4;
const PAD = 1.25;

// logo art, with room for its shadow and glow
const LOGO_PX = 1024;
const LOGO_PAD = 1.6;

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// soft picks a smaller mip, which is the cheap blur on the cards behind the logo
const FRAGMENT = `
uniform sampler2D map;
uniform float fade;
uniform float soft;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv, soft) * fade;
}`;

function iconPath(name: string): Path2D {
  const d = document.querySelector(`#i-${name} path`)?.getAttribute('d');
  if (!d) throw new Error(`no icon ${name}`);
  return new Path2D(d);
}

function texture(canvas: HTMLCanvasElement, anisotropy: number): CanvasTexture {
  const map = new CanvasTexture(canvas);
  map.premultiplyAlpha = true;
  map.generateMipmaps = true;
  map.minFilter = LinearMipmapLinearFilter;
  map.magFilter = LinearFilter;
  map.anisotropy = anisotropy;
  return map;
}

// same card as .pcard in the css, where u is a tenth of the card width
function drawCard(face: Face, spark: Path2D): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * PAD;
  canvas.height = CARD_H * PAD;
  const ctx = canvas.getContext('2d')!;
  const u = CARD_W / 10;
  ctx.translate((canvas.width - CARD_W) / 2, (canvas.height - CARD_H) / 2);

  ctx.fillStyle = EDGE;
  ctx.beginPath();
  ctx.roundRect(0, 0, CARD_W, CARD_H, u);
  ctx.fill();
  ctx.fillStyle = FILL[face.suit];
  ctx.beginPath();
  ctx.roundRect(0.4 * u, 0.4 * u, CARD_W - 0.8 * u, CARD_H - 0.8 * u, 0.6 * u);
  ctx.fill();

  ctx.fillStyle = INK[face.suit];
  const stamp = (path: Path2D, cx: number, cy: number, size: number) => {
    ctx.save();
    ctx.translate(cx - size / 2, cy - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.fill(path);
    ctx.restore();
  };
  stamp(spark, 1.75 * u, 1.75 * u, 1.2 * u);
  stamp(spark, CARD_W - 1.75 * u, CARD_H - 1.75 * u, 1.2 * u);
  stamp(iconPath(face.icon), CARD_W / 2, CARD_H / 2, 4.4 * u);
  return canvas;
}

async function drawLogo(): Promise<HTMLCanvasElement> {
  // firefox won't draw an svg that has no size of its own, so give it one
  const source = await (await fetch(`${import.meta.env.BASE_URL}assets/logo.svg`)).text();
  const sized = source.replace('<svg ', `<svg width="${LOGO_PX}" height="${LOGO_PX}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }));
  const image = new Image();
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LOGO_PX;
  const ctx = canvas.getContext('2d')!;
  const size = LOGO_PX / LOGO_PAD;
  const at = (LOGO_PX - size) / 2;
  // teal glow, then the soft drop shadow, then the logo clean on top
  ctx.shadowColor = 'rgba(0, 191, 156, 0.42)';
  ctx.shadowBlur = size * 0.24;
  ctx.drawImage(image, at, at, size, size);
  ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.055;
  ctx.drawImage(image, at, at, size, size);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(image, at, at, size, size);
  return canvas;
}

function material(map: CanvasTexture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { map: { value: map }, fade: { value: 1 }, soft: { value: 0 } },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    premultipliedAlpha: true,
    depthTest: false,
    depthWrite: false,
  });
}

export async function createOrbit(stage: HTMLElement, opts: { onSlow: () => void }): Promise<Orbit> {
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new Scene();
  const camera = new PerspectiveCamera();
  // everything hangs off this, and it is what leans toward the mouse
  const lean = new Group();
  scene.add(lean);

  const plane = new PlaneGeometry(1, 1);
  const spark = iconPath('spark');
  const maps = new Map<string, CanvasTexture>();
  for (const face of FACES) maps.set(face.icon, texture(drawCard(face, spark), anisotropy));

  const cards = SLOTS.map((slot) => {
    const mesh = new Mesh(plane, material(maps.get(slot.face.icon)!));
    lean.add(mesh);
    return mesh;
  });

  const logoMap = texture(await drawLogo(), anisotropy);
  const logo = new Mesh(plane, material(logoMap));
  lean.add(logo);

  let l: Layout;
  function resize(): void {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    l = layout(width, height);
    renderer.setSize(width, height, false);
    // one world unit is one css px at the middle of the orbit
    camera.fov = (Math.atan(height / 2 / l.dist) * 360) / Math.PI;
    camera.aspect = width / height;
    camera.near = l.dist * 0.1;
    camera.far = l.dist * 3;
    camera.position.set(0, 0, l.dist);
    camera.updateProjectionMatrix();
    logo.scale.setScalar(l.logo * LOGO_PAD);
    SLOTS.forEach((slot, i) => {
      const w = l.card[slot.ring] * PAD;
      cards[i].scale.set(w, w * 1.4, 1);
    });
  }
  resize();

  // where the mouse is, -1 to 1 from the middle of the stage
  const aim = { x: 0, y: 0 };
  function onMove(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return;
    const box = stage.getBoundingClientRect();
    aim.x = Math.max(-1, Math.min(1, ((event.clientX - box.left) / box.width) * 2 - 1));
    aim.y = Math.max(-1, Math.min(1, ((event.clientY - box.top) / box.height) * 2 - 1));
  }
  function onLeave(): void {
    aim.x = aim.y = 0;
  }

  // stiff spring with little damping, so the lean overshoots and wobbles into place
  const STIFF = 90;
  const DAMP = 6.5;
  const MAX_LEAN = [0.2, 0.3];
  const tilt = { x: 0, y: 0, vx: 0, vy: 0 };
  function spring(dt: number): void {
    const tx = aim.y * MAX_LEAN[0];
    const ty = aim.x * MAX_LEAN[1];
    // small fixed steps keep it stable after a long frame
    for (let left = dt; left > 0; left -= 1 / 120) {
      const step = Math.min(left, 1 / 120);
      tilt.vx += ((tx - tilt.x) * STIFF - tilt.vx * DAMP) * step;
      tilt.vy += ((ty - tilt.y) * STIFF - tilt.vy * DAMP) * step;
      tilt.x += tilt.vx * step;
      tilt.y += tilt.vy * step;
    }
  }

  const point = { x: 0, y: 0, z: 0 };
  const world = new Vector3();
  const euler = new Euler();
  let time = 0;
  let last = 0;
  let raf = 0;
  let visible = true;
  let stopped = false;

  // frame rate check over the first couple of seconds
  let checked = false;
  let frames = 0;
  let checkStart = 0;

  function draw(dt: number): void {
    time += dt;
    spring(dt);
    lean.rotation.set(tilt.x, tilt.y, 0);
    euler.copy(lean.rotation);
    SLOTS.forEach((slot, i) => {
      const mesh = cards[i];
      place(slot, time, l, point);
      mesh.position.set(point.x, point.y, point.z);
      // cards turn a little toward the middle as they go round
      mesh.rotation.set(slot.pitch, (-point.x / l.radius[0]) * 0.35, slot.roll);
      // fade and blur by how far behind the logo the card ends up once the orbit has leaned
      const near = nearness(world.copy(mesh.position).applyEuler(euler).z, l);
      const uniforms = (mesh.material as ShaderMaterial).uniforms;
      uniforms.fade.value = FAR_OPACITY + (1 - FAR_OPACITY) * near;
      uniforms.soft.value = (1 - near) * 1.7;
    });
    renderer.render(scene, camera);
  }

  function frame(now: number): void {
    raf = requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    draw(dt);
    if (checked) return;
    if (!checkStart) checkStart = now + 400;
    else if (now > checkStart) frames++;
    if (now > checkStart + 2500) {
      checked = true;
      if (frames / 2.5 < 24) opts.onSlow();
    }
  }

  // only draws while the hero is on screen and the tab is showing
  function run(): void {
    const should = visible && !document.hidden && !stopped;
    if (should && !raf) {
      last = performance.now();
      // a pause in the middle would look like a slow machine
      if (!checked) {
        frames = 0;
        checkStart = 0;
      }
      raf = requestAnimationFrame(frame);
    } else if (!should && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const watcher = new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    run();
  });
  watcher.observe(stage);
  document.addEventListener('visibilitychange', run);
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onMove);
  document.documentElement.addEventListener('pointerleave', onLeave);

  stage.append(renderer.domElement);
  draw(0);
  run();

  return {
    stop() {
      stopped = true;
      run();
      watcher.disconnect();
      document.removeEventListener('visibilitychange', run);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      renderer.domElement.remove();
      for (const mesh of [...cards, logo]) (mesh.material as ShaderMaterial).dispose();
      for (const map of maps.values()) map.dispose();
      logoMap.dispose();
      plane.dispose();
      renderer.dispose();
    },
  };
}
