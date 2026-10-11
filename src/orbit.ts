// the hero orbit: which card sits where. shared by the flat html cards and the 3d scene so they line up

export type Suit = 'pink' | 'black' | 'yellow' | 'teal' | 'indigo';

export interface Face {
  icon: string;
  suit: Suit;
}

export const FILL: Record<Suit, string> = {
  pink: '#FA4E93',
  black: '#16161A',
  yellow: '#FFD814',
  teal: '#00BF9C',
  indigo: '#3B46A4',
};

export const INK: Record<Suit, string> = {
  pink: '#0E0E10',
  black: '#F2F2F4',
  yellow: '#0E0E10',
  teal: '#0E0E10',
  indigo: '#F2F2F4',
};

export const EDGE = '#F2F2F4';

// the inner ring has ten logos, one card each
const INNER: Face[] = [
  { icon: 'youtube', suit: 'pink' },
  { icon: 'tiktok', suit: 'black' },
  { icon: 'claude', suit: 'yellow' },
  { icon: 'googlegemini', suit: 'indigo' },
  { icon: 'instagram', suit: 'pink' },
  { icon: 'x', suit: 'black' },
  { icon: 'openai', suit: 'teal' },
  { icon: 'facebook', suit: 'indigo' },
  { icon: 'reddit', suit: 'yellow' },
  { icon: 'discord', suit: 'indigo' },
];

// the outer ring has the other eight, twice each and always on opposite sides.
// so one copy is in front while the other is behind, and the front never shows a logo twice
const OUTER: Face[] = [
  { icon: 'bluesky', suit: 'indigo' },
  { icon: 'snapchat', suit: 'yellow' },
  { icon: 'threads', suit: 'black' },
  { icon: 'pinterest', suit: 'pink' },
  { icon: 'linkedin', suit: 'indigo' },
  { icon: 'google', suit: 'teal' },
  { icon: 'ollama', suit: 'black' },
  { icon: 'twitch', suit: 'indigo' },
];

export const FACES: Face[] = [...INNER, ...OUTER];

export interface Slot {
  face: Face;
  // 0 is the outer ring, 1 the inner
  ring: 0 | 1;
  angle: number;
  // small fixed offsets so the rings don't look machine made
  reach: number;
  lift: number;
  roll: number;
  pitch: number;
}

// same numbers every load
function noise(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return (v - Math.floor(v)) * 2 - 1;
}

function ringSlots(faces: Face[], count: number, ring: 0 | 1, start: number): Slot[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = i + ring * 40;
    // opposite cards share their reach and mirror their lift, so the outer pairs stay exactly opposite
    const pair = (i % (count / 2)) + ring * 40;
    return {
      face: faces[i % faces.length],
      ring,
      angle: start + (i / count) * Math.PI * 2,
      reach: 1 + noise(pair + 0.3) * 0.05,
      lift: noise(pair + 0.7) * 0.04 * (i < count / 2 ? 1 : -1),
      roll: noise(seed + 0.1) * 0.24,
      pitch: noise(seed + 0.5) * 0.14,
    };
  });
}

export const SLOTS: Slot[] = [...ringSlots(OUTER, 16, 0, 0.2), ...ringSlots(INNER, 10, 1, 0.52)];

// radians a second. the inner ring laps the outer one
export const SPEED = [(Math.PI * 2) / 150, (Math.PI * 2) / 100];

export interface Layout {
  width: number;
  height: number;
  // ring radius and card width in css px, outer then inner
  radius: [number, number];
  card: [number, number];
  // how far each ring tips toward the camera, and how much it rolls on screen
  tilt: [number, number];
  roll: [number, number];
  // camera distance from the middle of the orbit
  dist: number;
  logo: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function layout(width: number, height: number): Layout {
  const aspect = width / height;
  const outer = Math.min(width * (aspect < 1 ? 0.44 : 0.4), height * 0.7);
  // tall screens get a steeper ring so the orbit fills more than a thin strip
  const tilt = (clamp(16 + (1.3 - aspect) * 40, 16, 48) * Math.PI) / 180;
  return {
    width,
    height,
    radius: [outer, outer * 0.56],
    card: [clamp(outer * 0.075, 27, 46), clamp(outer * 0.122, 38, 76)],
    tilt: [tilt, tilt + 0.1],
    roll: [-0.05, 0.07],
    dist: outer * 2.6,
    logo: clamp(outer * 0.52, 150, 330),
  };
}

export interface Point {
  x: number;
  y: number;
  z: number;
}

// where a card is, y up and z toward the camera, with the orbit centre at 0
export function place(slot: Slot, time: number, l: Layout, out: Point): Point {
  const a = slot.angle + time * SPEED[slot.ring];
  const r = l.radius[slot.ring] * slot.reach;
  const x = r * Math.cos(a);
  const y = l.radius[0] * slot.lift;
  const z = r * Math.sin(a);
  // tip the ring toward the camera, then roll it a little on screen
  const tilt = l.tilt[slot.ring];
  const ty = y * Math.cos(tilt) - z * Math.sin(tilt);
  const tz = y * Math.sin(tilt) + z * Math.cos(tilt);
  const roll = l.roll[slot.ring];
  out.x = x * Math.cos(roll) - ty * Math.sin(roll);
  out.y = x * Math.sin(roll) + ty * Math.cos(roll);
  out.z = tz;
  return out;
}

// 0 for a card far behind the logo, 1 for one level with it or in front
export function nearness(z: number, l: Layout): number {
  const t = clamp(z / l.radius[0] / 0.5 + 1, 0, 1);
  return t * t * (3 - 2 * t);
}

export const FAR_OPACITY = 0.36;
