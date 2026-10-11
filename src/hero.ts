// the cards floating round the headline lean toward the cursor on a stiff, bouncy spring.
// the slow bob is css. this only runs frames while a card is still moving.

interface Floater {
  el: HTMLElement;
  // where it is and where it is heading: tilt in degrees and a small push in px
  rx: number;
  ry: number;
  push: number;
  vrx: number;
  vry: number;
  vpush: number;
  trx: number;
  try: number;
  tpush: number;
  cx: number;
  cy: number;
}

const STIFF = 190;
const DAMP = 9;
const REACH = 420; // px from a card where the cursor stops mattering
const MAX_TILT = 26;

export function setupHero(reduced: boolean): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;

  // pause the bob when the hero is off screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => hero.classList.toggle('is-away', !entry.isIntersecting)).observe(hero);
  }
  if (reduced) return;

  const floaters: Floater[] = Array.from(hero.querySelectorAll<HTMLElement>('[data-tilt]')).map((el) => ({
    el,
    rx: 0,
    ry: 0,
    push: 0,
    vrx: 0,
    vry: 0,
    vpush: 0,
    trx: 0,
    try: 0,
    tpush: 0,
    cx: 0,
    cy: 0,
  }));
  if (!floaters.length) return;

  let measured = false;
  const measure = () => {
    for (const f of floaters) {
      const rect = (f.el.parentElement!.parentElement as HTMLElement).getBoundingClientRect();
      f.cx = rect.left + rect.width / 2;
      f.cy = rect.top + rect.height / 2;
    }
    measured = true;
  };
  const stale = () => {
    measured = false;
  };

  let frame = 0;
  let last = 0;
  const tick = (now: number) => {
    frame = 0;
    const dt = Math.min(0.032, last ? (now - last) / 1000 : 0.016);
    let moving = false;
    for (const f of floaters) {
      f.vrx += ((f.trx - f.rx) * STIFF - f.vrx * DAMP) * dt;
      f.vry += ((f.try - f.ry) * STIFF - f.vry * DAMP) * dt;
      f.vpush += ((f.tpush - f.push) * STIFF - f.vpush * DAMP) * dt;
      f.rx += f.vrx * dt;
      f.ry += f.vry * dt;
      f.push += f.vpush * dt;
      const settled =
        Math.abs(f.trx - f.rx) + Math.abs(f.try - f.ry) + Math.abs(f.tpush - f.push) < 0.05 &&
        Math.abs(f.vrx) + Math.abs(f.vry) + Math.abs(f.vpush) < 0.5;
      if (settled) {
        f.rx = f.trx;
        f.ry = f.try;
        f.push = f.tpush;
        f.vrx = f.vry = f.vpush = 0;
      } else {
        moving = true;
      }
      const flat = f.rx === 0 && f.ry === 0 && f.push === 0;
      f.el.style.transform = flat
        ? ''
        : `translateZ(${f.push.toFixed(2)}px) rotateX(${f.rx.toFixed(2)}deg) rotateY(${f.ry.toFixed(2)}deg)`;
    }
    if (moving) {
      last = now;
      frame = requestAnimationFrame(tick);
    } else {
      last = 0;
    }
  };
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(tick);
  };

  const rest = () => {
    for (const f of floaters) f.trx = f.try = f.tpush = 0;
    wake();
  };

  hero.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType !== 'mouse') return;
      if (!measured) measure();
      for (const f of floaters) {
        const dx = event.clientX - f.cx;
        const dy = event.clientY - f.cy;
        const near = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
        // lean toward the cursor, harder the closer it gets, and lift a little
        f.try = Math.max(-1, Math.min(1, dx / 160)) * MAX_TILT * near;
        f.trx = Math.max(-1, Math.min(1, -dy / 160)) * MAX_TILT * near;
        f.tpush = near * near * 40;
      }
      wake();
    },
    { passive: true },
  );
  hero.addEventListener('pointerleave', rest);

  // a tap or click gives the card a flick
  for (const f of floaters) {
    f.el.addEventListener('pointerdown', () => {
      f.vry += (Math.random() < 0.5 ? -1 : 1) * 520;
      f.vrx -= 260;
      f.vpush += 380;
      wake();
    });
  }

  // the cards fly in on load, so anything measured before they land is wrong
  setTimeout(stale, 1200);
  window.addEventListener('scroll', stale, { passive: true });
  window.addEventListener('resize', stale);
}
