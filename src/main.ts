import './style.css';
import { pickMode, storeMode } from './mode';
import { setupFeatures } from './features';
import { setupHero } from './hero';
import type { TableScene } from './scene';

const root = document.documentElement;
const info = pickMode();
const reveal = setupFeatures(info.reducedMotion);

const deck = document.querySelector<HTMLElement>('.deck')!;
const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));
const dots = Array.from(document.querySelectorAll<HTMLAnchorElement>('.dots a'));
const dotFor = (name: string) => dots.find((dot) => dot.dataset.dot === name);

let scene: TableScene | null = null;
let dealt = 0;

const DEAL_MS = 330;
const FLIP_MS = 400;

// lite mode deal: the html card itself slides in from the deck face down, then flips
function dealLite(card: HTMLElement): Promise<void> {
  if (info.reducedMotion || !card.animate) return Promise.resolve();
  const from = deck.getBoundingClientRect();
  const to = card.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = from.width / to.width;
  const landed = DEAL_MS / (DEAL_MS + FLIP_MS);
  card.classList.add('is-dealing');
  const flight = card.animate(
    [
      {
        transform: `translate(${dx}px, ${dy}px) rotate(-24deg) rotateY(180deg) scale(${scale})`,
        easing: 'cubic-bezier(0.3, 1.3, 0.6, 1)',
      },
      { transform: 'translate(0, 0) rotate(0deg) rotateY(180deg) scale(1)', offset: landed, easing: 'ease-in' },
      // the flip pops bigger at the halfway point
      {
        transform: 'translate(0, 0) rotate(0deg) rotateY(90deg) scale(1.09)',
        offset: landed + (1 - landed) / 2,
        easing: 'ease-out',
      },
      { transform: 'translate(0, 0) rotate(0deg) rotateY(0deg) scale(1)' },
    ],
    { duration: DEAL_MS + FLIP_MS },
  );
  return flight.finished.then(
    () => {},
    () => {},
  );
}

async function deal(card: HTMLElement): Promise<void> {
  if (card.dataset.state) return;
  card.dataset.state = 'dealing';
  const name = card.dataset.card || '';
  if (scene) {
    await scene.deal(card, deck);
  } else {
    await dealLite(card);
  }
  card.classList.remove('is-dealing');
  card.classList.add('is-dealt');
  card.dataset.state = 'dealt';
  dotFor(name)?.classList.add('is-dealt');
  dealt++;
  if (dealt === cards.length) deck.classList.add('is-empty');
  reveal[name]?.();
}

function watchCards(): void {
  if (!('IntersectionObserver' in window)) {
    cards.forEach(deal);
    return;
  }
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        seen.unobserve(entry.target);
        deal(entry.target as HTMLElement);
      }
    },
    { threshold: 0.35 },
  );
  cards.forEach((card) => seen.observe(card));

  // step dots follow whichever card section is in the middle of the screen
  const current = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const dot = dotFor((entry.target as HTMLElement).dataset.step || '');
        if (!dot) continue;
        if (entry.isIntersecting) dot.setAttribute('aria-current', 'true');
        else dot.removeAttribute('aria-current');
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  document.querySelectorAll('.deal').forEach((section) => current.observe(section));

  // the dots and the deck only show while the story is on screen
  const story = document.querySelector('.story');
  if (story) {
    new IntersectionObserver(([entry]) => document.body.classList.toggle('in-story', entry.isIntersecting), {
      rootMargin: '-30% 0px -30% 0px',
    }).observe(story);
  }
}

// the app mock, agent cards and the rest get dealt in as they scroll into view
function watchDealIns(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-deal-in]'));
  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-in'));
    return;
  }
  const seen = new IntersectionObserver(
    (entries) => {
      // cards that show up together go out one after another
      let i = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        seen.unobserve(entry.target);
        const item = entry.target as HTMLElement;
        item.style.setProperty('--i', String(i++));
        item.classList.add('is-in');
      }
    },
    { threshold: 0.15 },
  );
  items.forEach((item) => seen.observe(item));
}

function goLite(): void {
  scene?.dispose();
  scene = null;
  root.classList.remove('full');
  root.classList.add('lite');
}

// three.js only loads after the page has painted, and only when the device can take it
function loadScene(): void {
  const start = async () => {
    try {
      const { createScene } = await import('./scene');
      scene = createScene({ watchFrames: !info.forced, onSlow: goLite });
      root.classList.add('full');
    } catch {
      goLite();
    }
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

function modeToggle(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-mode-toggle]');
  if (!button || !info.canSwitch) return;
  const next = info.mode === 'full' ? 'lite' : 'full';
  button.textContent = next === 'lite' ? 'Switch to lite mode' : 'Switch to the full 3D table';
  button.hidden = false;
  button.addEventListener('click', () => {
    storeMode(next);
    // drop any ?lite or ?full so the stored choice wins
    location.href = location.pathname;
  });
}

if (info.mode === 'full') loadScene();
else root.classList.add('lite');
setupHero(info.reducedMotion);
watchCards();
watchDealIns();
modeToggle();
