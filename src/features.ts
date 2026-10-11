// the small interaction on each card. every one works on plain html that is already in the page,
// so the content reads fine before any of this runs.

type Reveal = () => void;

const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

function $<T extends HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
}

function $$<T extends HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}

// 1. brand cards fan out, picking one swaps the accounts under it
function brands(card: HTMLElement): Reveal {
  const buttons = $$<HTMLButtonElement>(card, '.fan button');
  const panels = $$(card, '.brand-panel');
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      for (const panel of panels) panel.hidden = panel.dataset.panel !== button.dataset.brand;
    });
  }
  return () => {};
}

// 2. site icons pop on, each brand has its own login state per site
function accounts(card: HTMLElement): Reveal {
  const buttons = $$<HTMLButtonElement>(card, '.seg button');
  const sets = $$(card, '.tiles');
  for (const set of sets) {
    $$(set, 'li').forEach((li, i) => li.style.setProperty('--i', String(i)));
  }
  const pop = (set: HTMLElement) => {
    set.classList.remove('pop');
    void set.offsetWidth; // restart the pop
    set.classList.add('pop');
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      for (const other of buttons) other.setAttribute('aria-pressed', String(other === button));
      for (const set of sets) {
        set.hidden = set.dataset.tiles !== button.dataset.set;
        if (!set.hidden) pop(set);
      }
    });
  }
  return () => {
    const shown = sets.find((set) => !set.hidden);
    if (shown) pop(shown);
  };
}

// 3. dotted line chart, the hottest point glows, a point shows its growth score in a chip
const WEEKS = 6;
const SERIES = [
  { name: 'Cozy desk setups', scores: [12, 20, 34, 58, 121, 212] },
  { name: 'Budget keyboards', scores: [30, 38, 44, 61, 70, 96] },
  { name: 'Cable management', scores: [22, 18, 27, 33, 49, 58] },
];

function trends(card: HTMLElement): Reveal {
  const chart = $(card, '[data-chart]');
  const rows = $$(card, '.ranked li');
  const top = Math.max(...SERIES.flatMap((s) => s.scores));
  const x = (week: number) => 5 + (week * 90) / (WEEKS - 1);
  const y = (score: number) => 93 - (score / top) * 73;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  chart.append(svg);

  const points: HTMLButtonElement[] = [];
  let resting: HTMLButtonElement | null = null;

  const show = (point: HTMLButtonElement | null) => {
    for (const other of points) other.classList.toggle('is-on', other === point);
    rows.forEach((row, i) => row.classList.toggle('is-on', point?.dataset.series === String(i)));
  };

  SERIES.forEach((series, si) => {
    const line = document.createElementNS(ns, 'polyline');
    line.setAttribute('points', series.scores.map((score, week) => `${x(week)},${y(score)}`).join(' '));
    if (si === 0) line.setAttribute('class', 'hot');
    svg.append(line);

    series.scores.forEach((score, week) => {
      const point = document.createElement('button');
      point.type = 'button';
      point.className = 'pt' + (si === 0 ? ' hot' : '');
      point.dataset.series = String(si);
      point.style.left = `${x(week)}%`;
      point.style.top = `${y(score)}%`;
      point.setAttribute('aria-label', `${series.name}, week ${week + 1}, growth score ${score}`);
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = `+${score}`;
      point.append(chip);
      if (score === top) {
        point.classList.add('hottest');
        resting = point;
      }
      point.addEventListener('pointerenter', () => show(point));
      point.addEventListener('focus', () => show(point));
      point.addEventListener('click', () => show(point));
      points.push(point);
      chart.append(point);
    });
  });

  chart.addEventListener('pointerleave', () => show(resting));
  chart.addEventListener('focusout', (event) => {
    if (!chart.contains(event.relatedTarget as Node | null)) show(resting);
  });

  return () => show(resting);
}

// 4. a short typed conversation
function chat(card: HTMLElement, reduced: boolean): Reveal {
  const log = $(card, '[data-chat]');
  const replay = $<HTMLButtonElement>(card, '[data-replay]');
  const messages = $$(log, '.msg');
  const texts = messages.map((m) => (m.textContent || '').replace(/\s+/g, ' ').trim());

  // screen readers get the whole conversation once, not letter by letter
  const spoken = document.createElement('div');
  spoken.className = 'sr';
  texts.forEach((text, i) => {
    const line = document.createElement('p');
    line.textContent = `${messages[i].classList.contains('me') ? 'You' : 'TrendDeck'}: ${text}`;
    spoken.append(line);
  });
  log.before(spoken);
  log.setAttribute('aria-hidden', 'true');

  let run = 0;
  const play = async () => {
    const mine = ++run;
    if (reduced) {
      messages.forEach((m, i) => {
        m.textContent = texts[i];
        m.classList.remove('is-wait', 'is-typing');
      });
      return;
    }
    for (const m of messages) {
      m.classList.add('is-wait');
      m.classList.remove('is-typing');
    }
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      await wait(i === 0 ? 250 : 550);
      if (mine !== run) return;
      m.classList.remove('is-wait');
      if (m.classList.contains('me')) {
        m.textContent = texts[i];
        continue;
      }
      m.textContent = '';
      m.classList.add('is-typing');
      for (let n = 1; n <= texts[i].length; n++) {
        m.textContent = texts[i].slice(0, n);
        await wait(16);
        if (mine !== run) return;
      }
      m.classList.remove('is-typing');
    }
  };

  replay.addEventListener('click', play);
  return play;
}

// 5. the draft slides to each platform and each one gets a yellow spark
function posting(card: HTMLElement, reduced: boolean): Reveal {
  const stage = $(card, '[data-post]');
  const draft = $(stage, '.draft');
  const targets = $$(stage, '.targets li');
  const status = $(stage, '[data-post-status]');
  const go = $<HTMLButtonElement>(stage, '[data-post-go]');
  let busy = false;

  const play = async () => {
    if (busy) return;
    busy = true;
    go.disabled = true;
    for (const target of targets) target.classList.remove('won');
    stage.classList.remove('is-won');
    card.classList.remove('is-won');
    status.textContent = 'Posting...';

    let posted = 0;
    for (const target of targets) {
      if (!reduced) {
        const ghost = draft.cloneNode(true) as HTMLElement;
        ghost.classList.add('ghost');
        ghost.setAttribute('aria-hidden', 'true');
        stage.append(ghost);
        const from = ghost.getBoundingClientRect();
        const icon = $(target, '.site').getBoundingClientRect();
        const dx = icon.left + icon.width / 2 - (from.left + from.width / 2);
        const dy = icon.top + icon.height / 2 - (from.top + from.height / 2);
        void ghost.offsetWidth;
        ghost.style.transform = `translate(${dx}px, ${dy}px) rotate(8deg) scale(0.28)`;
        ghost.style.opacity = '0';
        await wait(430);
        ghost.remove();
      }
      target.classList.add('won');
      posted++;
      status.textContent = `Posted to ${posted} of ${targets.length}`;
      if (!reduced) await wait(140);
    }
    status.textContent = `Posted to all ${targets.length}. That's a win.`;
    stage.classList.add('is-won');
    card.classList.add('is-won');
    go.textContent = 'Post it again';
    go.disabled = false;
    busy = false;
  };

  go.addEventListener('click', play);
  return play;
}

// 6. four small cards that flip over
function extras(card: HTMLElement): Reveal {
  for (const mini of $$<HTMLButtonElement>(card, '.mini')) {
    mini.addEventListener('click', () => {
      mini.setAttribute('aria-pressed', String(mini.getAttribute('aria-pressed') !== 'true'));
    });
  }
  return () => {};
}

function copyButton(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-copy]');
  const code = document.querySelector<HTMLElement>('[data-install]');
  if (!button || !code) return;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code.textContent || '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy';
    }
    setTimeout(() => (button.textContent = 'Copy'), 1600);
  });
}

export function setupFeatures(reduced: boolean): Record<string, Reveal> {
  const card = (name: string) => $(document, `[data-card="${name}"]`);
  copyButton();
  return {
    brands: brands(card('brands')),
    accounts: accounts(card('accounts')),
    trends: trends(card('trends')),
    chat: chat(card('chat'), reduced),
    posting: posting(card('posting'), reduced),
    extras: extras(card('extras')),
  };
}
