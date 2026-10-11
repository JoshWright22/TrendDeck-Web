// the 3d half of the table: the logo's hand in the hero and the cards the dealer throws.
// it draws on a clear canvas over the page, one world unit per css pixel, so a card can
// fly to wherever its html twin sits and hand over to it when it lands.

import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';

export interface TableScene {
  deal(card: HTMLElement, deck: HTMLElement): Promise<void>;
  dispose(): void;
}

interface Options {
  hand: HTMLImageElement;
  watchFrames: boolean;
  onSlow: () => void;
}

const FELT = '#0E0E10';
const PANEL = '#16161A';
const WHITE = '#F2F2F4';
const TEAL = '#00BF9C';
const YELLOW = '#FFD814';
const PINK = '#FA4E93';
const INDIGO = '#3B46A4';

const FOV = 30;
const CARD_H = 1.4; // 5:7
const THICK = 0.01;
const DEAL_MS = 430;
const FLIP_MS = 500;
const FADE_MS = 200;

// ---------- drawing card faces ----------

function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// the four point spark from the logo
function spark(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  const k = r * 0.28125;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + k, cy - k);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx + k, cy + k);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - k, cy + k);
  ctx.lineTo(cx - r, cy);
  ctx.lineTo(cx - k, cy - k);
  ctx.closePath();
  ctx.fill();
}

// one card of the logo, drawn in the logo's own units (84 x 116 with its white edge)
function logoCard(fill: string, suit: string, withTD: boolean): Texture {
  return paint(336, 464, (ctx) => {
    ctx.scale(4, 4);
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, 84, 116);
    ctx.fillStyle = fill;
    roundRect(ctx, 4, 4, 76, 108, 10);
    ctx.fill();
    ctx.fillStyle = suit;
    spark(ctx, 12, 16, 7.2);
    spark(ctx, 72, 100, 7.2);
    if (!withTD) return;
    // same transform chain as the TD group in logo.svg
    ctx.translate(-22, -8);
    ctx.translate(64, 68);
    ctx.scale(0.68, 0.68);
    ctx.translate(-64, -66);
    ctx.lineCap = 'round';
    ctx.lineWidth = 13;
    ctx.strokeStyle = FELT;
    ctx.stroke(new Path2D('M30 34 H78 M50 34 V96'));
    ctx.stroke(new Path2D('M66 96 C92 96 100 80 100 64 C100 52 96 44 88 38'));
    ctx.beginPath();
    ctx.arc(88, 36, 8, 0, Math.PI * 2);
    ctx.fillStyle = YELLOW;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.stroke();
  });
}

// blank front of a feature card, matches .card-face in the css at a 360px wide card
function featureFront(suit: string): Texture {
  return paint(500, 700, (ctx) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, 500, 700);
    ctx.fillStyle = PANEL;
    roundRect(ctx, 4.2, 4.2, 491.6, 691.6, 12.5);
    ctx.fill();
    ctx.fillStyle = suit;
    spark(ctx, 33, 33, 11.3);
    spark(ctx, 467, 667, 11.3);
  });
}

function featureBack(): Texture {
  return paint(500, 700, (ctx) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(0, 0, 500, 700);
    ctx.fillStyle = INDIGO;
    roundRect(ctx, 4.2, 4.2, 491.6, 691.6, 12.5);
    ctx.fill();
    ctx.fillStyle = WHITE;
    spark(ctx, 250, 350, 45);
  });
}

function softShadow(): Texture {
  return paint(128, 180, (ctx) => {
    ctx.shadowColor = 'rgba(0,0,0,1)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#000';
    roundRect(ctx, 26, 30, 76, 120, 8);
    ctx.fill();
  });
}

// ---------- card geometry ----------

interface CardParts {
  front: BufferGeometry;
  back: BufferGeometry;
  side: BufferGeometry;
}

// a card one unit wide: two faces with uvs across the whole card and a thin white rim
function cardParts(radius: number): CardParts {
  const w = 1;
  const h = CARD_H;
  const x = -w / 2;
  const y = -h / 2;
  const shape = new Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.absarc(x + w - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + w, y + h - radius);
  shape.absarc(x + w - radius, y + h - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + h);
  shape.absarc(x + radius, y + h - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);

  const face = new ShapeGeometry(shape, 6);
  const pos = face.attributes.position;
  const uv = face.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);

  const front = face.clone().translate(0, 0, THICK / 2);
  const back = face.clone().rotateY(Math.PI).translate(0, 0, -THICK / 2);
  const side = new ExtrudeGeometry(shape, { depth: THICK, bevelEnabled: false, curveSegments: 6 }).translate(
    0,
    0,
    -THICK / 2,
  );
  face.dispose();
  return { front, back, side };
}

function buildCard(parts: CardParts, front: Texture, back: Texture, fades: boolean): { group: Group; materials: Material[] } {
  const frontMat = new MeshLambertMaterial({ map: front, transparent: fades });
  const backMat = new MeshLambertMaterial({ map: back, transparent: fades });
  const rimMat = new MeshLambertMaterial({ color: WHITE, transparent: fades });
  const capMat = new MeshBasicMaterial({ visible: false });
  const group = new Group();
  // the extrude puts its flat caps in group 0, those are hidden so only the rim shows
  group.add(new Mesh(parts.front, frontMat), new Mesh(parts.back, backMat), new Mesh(parts.side, [capMat, rimMat]));
  return { group, materials: [frontMat, backMat, rimMat, capMat] };
}

// ---------- easing ----------

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
// slight overshoot, the way a dealt card slides past and settles
const overshoot = (t: number) => 1 + 2.1 * Math.pow(t - 1, 3) + 1.1 * Math.pow(t - 1, 2);

interface Flight {
  el: HTMLElement;
  deck: HTMLElement;
  group: Group;
  shadow: Mesh;
  materials: Material[];
  start: number;
  landedAt: number;
  resolve: () => void;
}

export function createScene(options: Options): TableScene {
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  document.body.append(canvas);

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 10000);
  // lights add up to 1 on a card lying flat, so brand colors come out as picked
  scene.add(new AmbientLight(0xffffff, Math.PI * 0.62));
  const key = new DirectionalLight(0xffffff, Math.PI * 0.453);
  key.position.set(-0.35, 0.55, 1);
  scene.add(key);

  let width = 1;
  let height = 1;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    const dist = height / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.aspect = width / height;
    camera.position.set(0, 0, dist);
    camera.near = dist / 10;
    camera.far = dist * 2;
    camera.updateProjectionMatrix();
  };
  const worldX = (px: number) => px - width / 2;
  const worldY = (py: number) => height / 2 - py;

  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(thing: T): T => {
    disposables.push(thing);
    return thing;
  };

  // ----- the logo's hand, rebuilt from three real cards -----
  const handParts = cardParts(14 / 84);
  const plainBack = keep(logoCard(INDIGO, WHITE, false));
  const handCards = [
    { tex: plainBack, angle: 24 },
    { tex: keep(logoCard(PINK, WHITE, false)), angle: 12 },
    { tex: keep(logoCard(TEAL, FELT, true)), angle: 0 },
  ].map(({ tex, angle }) => {
    const { group, materials } = buildCard(handParts, tex, plainBack, false);
    materials.forEach(keep);
    // the flat offset shadow each card has in the logo
    const shadowMat = keep(new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    const shadow = new Mesh(handParts.front, shadowMat);
    shadow.position.set(2 / 84, -3 / 84, -THICK * 2.5);
    group.add(shadow);
    return { group, angle: (angle * Math.PI) / 180 };
  });
  const handTilt = new Group();
  const handPivot = new Group();
  handTilt.add(handPivot);
  handCards.forEach((card) => handPivot.add(card.group));
  scene.add(handTilt);

  const tilt = { x: 0, y: 0, tx: 0, ty: 0, lift: 0 };

  // returns true while the hand is still easing toward where it should be
  const placeHand = (): boolean => {
    const rect = options.hand.getBoundingClientRect();
    const onScreen = rect.width > 0 && rect.bottom > 0 && rect.top < height;
    handTilt.visible = onScreen;
    if (!onScreen) return false;

    const unit = rect.width / 176; // logo.svg is 176 units across
    handTilt.position.set(worldX(rect.left + rect.width / 2), worldY(rect.top + rect.height / 2), 0);
    // cards pivot around the bottom of the hand, (64,128) in the svg, the image center is (58,66)
    handPivot.position.set(6 * unit, -62 * unit, 0);

    // scrolling away tips the hand back and pulls the cards apart
    const away = clamp01(window.scrollY / Math.max(1, height * 0.9));
    tilt.lift += (away - tilt.lift) * 0.2;
    tilt.x += (tilt.tx - tilt.x) * 0.12;
    tilt.y += (tilt.ty - tilt.y) * 0.12;
    handTilt.rotation.set(tilt.x - tilt.lift * 0.75, tilt.y, 0);

    handCards.forEach((card, i) => {
      card.group.position.set(
        -Math.sin(card.angle) * 62 * unit,
        Math.cos(card.angle) * 62 * unit,
        i * unit * (1.6 + tilt.lift * 16),
      );
      card.group.rotation.z = card.angle;
      card.group.scale.set(84 * unit, (116 * unit) / CARD_H, 84 * unit);
    });

    return (
      Math.abs(tilt.tx - tilt.x) > 0.001 || Math.abs(tilt.ty - tilt.y) > 0.001 || Math.abs(away - tilt.lift) > 0.001
    );
  };

  // ----- dealt cards -----
  const dealParts = cardParts(12 / 360);
  const backTex = keep(featureBack());
  const shadowTex = keep(softShadow());
  const shadowGeo = keep(new PlaneGeometry(1.5, 1.5 * CARD_H));
  const fronts = new Map<string, Texture>();
  const frontFor = (suit: string) => {
    let tex = fronts.get(suit);
    if (!tex) {
      tex = keep(featureFront(suit));
      fronts.set(suit, tex);
    }
    return tex;
  };
  const flights: Flight[] = [];

  const endFlight = (flight: Flight) => {
    scene.remove(flight.group, flight.shadow);
    flight.materials.forEach((m) => m.dispose());
    (flight.shadow.material as Material).dispose();
    flights.splice(flights.indexOf(flight), 1);
  };

  const stepFlight = (flight: Flight, now: number) => {
    const to = flight.el.getBoundingClientRect();
    const from = flight.deck.getBoundingClientRect();
    const tx = worldX(to.left + to.width / 2);
    const ty = worldY(to.top + to.height / 2);
    const t = now - flight.start;
    const { group, shadow } = flight;
    const shade = shadow.material as MeshBasicMaterial;

    let x = tx;
    let y = ty;
    let w = to.width;
    let z = 1;
    let fade = 1;
    group.rotation.set(0, 0, 0);

    if (t < DEAL_MS) {
      // slide out of the deck face down, a little spin, settle past the spot and back
      const u = t / DEAL_MS;
      const k = overshoot(u);
      x = lerp(worldX(from.left + from.width / 2), tx, k);
      y = lerp(worldY(from.top + from.height / 2), ty, k);
      w = lerp(from.width, to.width, easeOut(u));
      z += Math.sin(Math.PI * u) * to.width * 0.3;
      group.rotation.set(Math.sin(Math.PI * u) * 0.3, Math.PI, (1 - k) * 0.9);
    } else if (t < DEAL_MS + FLIP_MS) {
      const u = (t - DEAL_MS) / FLIP_MS;
      z += Math.sin(Math.PI * u) * to.width * 0.3;
      group.rotation.y = Math.PI * (1 - easeInOut(u));
    } else {
      if (!flight.landedAt) {
        flight.landedAt = now;
        flight.resolve();
      }
      // the html card is under it now, fade the 3d one off the top
      fade = 1 - clamp01((now - flight.landedAt) / FADE_MS);
      for (const m of flight.materials) m.opacity = fade;
      if (fade <= 0) {
        endFlight(flight);
        return;
      }
    }

    group.position.set(x, y, z);
    group.scale.setScalar(w);
    const lift = clamp01(z / Math.max(1, to.width * 0.3));
    shadow.position.set(x + z * 0.12, y - 6 - z * 0.25, 0);
    shadow.scale.setScalar(w * (1 + lift * 0.25));
    shade.opacity = fade * lerp(0.55, 0.28, lift);
  };

  // ----- the loop only runs while something is moving -----
  let frame = 0;
  let lastTime = 0;
  let disposed = false;
  let shown = false;
  const samples: number[] = [];
  let watching = options.watchFrames;

  const tick = (now: number) => {
    frame = 0;
    if (disposed) return;

    // a few seconds of bad frames and the page drops to lite mode
    if (watching && lastTime) {
      samples.push(now - lastTime);
      if (samples.length >= 40) {
        const sorted = samples.slice().sort((a, b) => a - b);
        watching = false;
        if (sorted[20] > 45) {
          options.onSlow();
          return;
        }
      }
    }

    const handMoving = placeHand();
    for (const flight of flights.slice()) stepFlight(flight, now);
    renderer.render(scene, camera);

    if (!shown) {
      shown = true;
      document.documentElement.classList.add('hand-3d');
    }
    if (handMoving || flights.length) {
      lastTime = now;
      frame = requestAnimationFrame(tick);
    } else {
      lastTime = 0;
    }
  };
  const wake = () => {
    if (!frame && !disposed) frame = requestAnimationFrame(tick);
  };

  const onPointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !handTilt.visible) return;
    tilt.ty = (event.clientX / width - 0.5) * 0.5;
    tilt.tx = (event.clientY / height - 0.5) * 0.36;
    wake();
  };
  const onResize = () => {
    resize();
    wake();
  };
  const onLost = (event: Event) => {
    event.preventDefault();
    options.onSlow();
  };

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', onResize);
  window.addEventListener('pointermove', onPointer, { passive: true });
  canvas.addEventListener('webglcontextlost', onLost);

  resize();
  wake();

  return {
    deal(card, deck) {
      return new Promise<void>((resolve) => {
        const suit = card.classList.contains('suit-teal') ? TEAL : card.classList.contains('suit-yellow') ? YELLOW : WHITE;
        const { group, materials } = buildCard(dealParts, frontFor(suit), backTex, true);
        const shadow = new Mesh(
          shadowGeo,
          new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0 }),
        );
        scene.add(shadow, group);
        flights.push({ el: card, deck, group, shadow, materials, start: performance.now(), landedAt: 0, resolve });
        wake();
      });
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      canvas.removeEventListener('webglcontextlost', onLost);
      // anything still in the air lands right away so no card is left unseen
      for (const flight of flights.slice()) {
        if (!flight.landedAt) flight.resolve();
        endFlight(flight);
      }
      disposables.forEach((thing) => thing.dispose());
      [handParts, dealParts].forEach((parts) => {
        parts.front.dispose();
        parts.back.dispose();
        parts.side.dispose();
      });
      renderer.dispose();
      canvas.remove();
      document.documentElement.classList.remove('hand-3d');
    },
  };
}
