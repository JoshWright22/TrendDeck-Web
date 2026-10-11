import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter-tight/latin-800.css';
import './style.css';
import { pickMode, storeMode } from './mode';
import { FAR_OPACITY, SLOTS, layout, nearness, place } from './orbit';
import type { Orbit } from './scene';

const info = pickMode();
const stage = document.querySelector<HTMLElement>('.stage')!;
const flat = document.querySelector<HTMLElement>('.flat')!;
const logo = document.querySelector<HTMLElement>('.hero-logo')!;
const liteSwitch = document.querySelector<HTMLButtonElement>('.lite-switch')!;

let mode = info.mode;
let orbit: Orbit | null = null;

const SVG = 'http://www.w3.org/2000/svg';

function icon(name: string, cls: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', cls);
  const use = document.createElementNS(SVG, 'use');
  use.setAttribute('href', `#i-${name}`);
  svg.append(use);
  return svg;
}

// the flat hero cards. they are the whole hero in lite mode and stand in until the 3d orbit is ready
const flatCards = SLOTS.map((slot, i) => {
  const card = document.createElement('div');
  card.className = `pcard suit-${slot.face.suit}`;
  card.style.setProperty('--i', String(i));
  card.append(icon('spark', 'spark'), icon(slot.face.icon, 'glyph'), icon('spark', 'spark'));
  return card;
});

function placeFlat(): void {
  const l = layout(stage.clientWidth, stage.clientHeight);
  const p = { x: 0, y: 0, z: 0 };
  logo.style.setProperty('--logo', `${l.logo}px`);
  SLOTS.forEach((slot, i) => {
    place(slot, 0, l, p);
    const scale = l.dist / (l.dist - p.z);
    const near = nearness(p.z, l);
    const x = p.x * scale;
    const y = -p.y * scale;
    const s = flatCards[i].style;
    s.fontSize = `${(l.card[slot.ring] * scale) / 10}px`;
    s.translate = `${l.width / 2 + x}px ${l.height / 2 + y}px`;
    s.rotate = `${-slot.roll}rad`;
    s.zIndex = String(1000 + Math.round(p.z));
    s.filter = near < 0.98 ? `blur(${((1 - near) * 1.6).toFixed(2)}px)` : '';
    s.setProperty('--o', (FAR_OPACITY + (1 - FAR_OPACITY) * near).toFixed(3));
    // where the deal starts from: the middle of the stage
    s.setProperty('--cx', `${l.width / 2}px`);
    s.setProperty('--cy', `${l.height / 2}px`);
  });
}

placeFlat();
flat.append(...flatCards);
const flatReady = performance.now();
window.addEventListener('resize', placeFlat);

function setMode(next: 'full' | 'lite'): void {
  mode = next;
  liteSwitch.textContent = `Lite mode: ${next === 'lite' ? 'on' : 'off'}`;
  if (next === 'lite') {
    orbit?.stop();
    orbit = null;
    stage.classList.remove('is-live');
  } else {
    void startOrbit();
  }
}

async function startOrbit(): Promise<void> {
  try {
    const { createOrbit } = await import('./scene');
    // let the flat cards finish their deal before swapping them out
    const wait = flatReady + 1200 - performance.now();
    if (wait > 0) await new Promise((done) => setTimeout(done, wait));
    if (mode !== 'full' || orbit) return;
    orbit = await createOrbit(stage, {
      // the frame rate is bad, so go back to the flat cards unless the visitor asked for 3d
      onSlow: () => {
        if (!info.forced) setMode('lite');
      },
    });
    if (mode !== 'full') {
      orbit.stop();
      orbit = null;
      return;
    }
    stage.classList.add('is-live');
  } catch {
    setMode('lite');
  }
}

if (info.canSwitch) {
  liteSwitch.hidden = false;
  liteSwitch.addEventListener('click', () => {
    const next = mode === 'lite' ? 'full' : 'lite';
    storeMode(next);
    info.forced = true;
    setMode(next);
  });
}

liteSwitch.textContent = `Lite mode: ${mode === 'lite' ? 'on' : 'off'}`;
if (mode === 'full') {
  // three.js is fetched after the first paint
  if (window.requestIdleCallback) window.requestIdleCallback(() => void startOrbit());
  else setTimeout(() => void startOrbit(), 200);
}

// deal sections in the first time they scroll into view
const dealt = Array.from(document.querySelectorAll<HTMLElement>('.deal'));
if (info.reducedMotion || !('IntersectionObserver' in window)) {
  dealt.forEach((el) => el.classList.add('in'));
} else {
  const seen = new IntersectionObserver(
    (entries) => {
      // cards that show up together go out one after another
      let i = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target as HTMLElement;
        el.style.setProperty('--i', String(i++));
        el.classList.add('in');
        seen.unobserve(el);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.15 },
  );
  dealt.forEach((el) => seen.observe(el));
}

// cards lean toward the pointer while it is over them
if (!info.reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
  for (const card of document.querySelectorAll<HTMLElement>('.feature, .agent')) {
    card.addEventListener('pointermove', (event) => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - 0.5;
      const y = (event.clientY - box.top) / box.height - 0.5;
      // wide cards get less angle so their far edge doesn't swing out
      const max = Math.min(14, 3200 / box.width);
      card.style.setProperty('--ry', `${(x * max).toFixed(2)}deg`);
      card.style.setProperty('--rx', `${(-y * max).toFixed(2)}deg`);
      card.classList.add('is-tilting');
    });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('is-tilting');
      card.style.removeProperty('--rx');
      card.style.removeProperty('--ry');
    });
  }
}

// ios only shows :active on things with a touch listener
document.addEventListener('touchstart', () => {}, { passive: true });
