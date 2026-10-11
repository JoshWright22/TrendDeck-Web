// decides between the full 3d table and lite mode (css cards, no webgl)

export interface ModeInfo {
  mode: 'full' | 'lite';
  reducedMotion: boolean;
  // true when the visitor or the url picked the mode, so the frame rate watchdog stays out of it
  forced: boolean;
  // false when webgl is missing or motion is off, so there is nothing to switch to
  canSwitch: boolean;
}

const KEY = 'td-mode';

// software renderers and old phone or laptop chips that struggle with a full page canvas
const WEAK_GPU =
  /swiftshader|llvmpipe|softpipe|software|basic render|mali-4|mali-t[67]|adreno \(tm\) [234]\d\d|powervr sgx|videocore|gma |hd graphics [234]000|hd graphics$/i;

function probeWebgl(): { ok: boolean; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const opts = { failIfMajorPerformanceCaveat: true };
    const gl = (canvas.getContext('webgl2', opts) || canvas.getContext('webgl', opts)) as WebGLRenderingContext | null;
    if (!gl) return { ok: false, renderer: '' };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    // hand the context back so the real one is not competing with it
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { ok: true, renderer };
  } catch {
    return { ok: false, renderer: '' };
  }
}

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function storeMode(mode: 'full' | 'lite'): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // private windows can refuse storage, the choice just won't stick
  }
}

export function pickMode(): ModeInfo {
  const query = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reducedMotion) return { mode: 'lite', reducedMotion, forced: true, canSwitch: false };

  const gl = probeWebgl();
  if (!gl.ok) return { mode: 'lite', reducedMotion, forced: true, canSwitch: false };

  const choice = query.has('lite') ? 'lite' : query.has('full') ? 'full' : stored();
  if (choice === 'lite' || choice === 'full') {
    return { mode: choice, reducedMotion, forced: true, canSwitch: true };
  }

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const lowMemory = nav.deviceMemory !== undefined && nav.deviceMemory < 4;
  const fewCores = nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 2;
  const saveData = nav.connection?.saveData === true;
  const weak = WEAK_GPU.test(gl.renderer) || lowMemory || fewCores || saveData;

  return { mode: weak ? 'lite' : 'full', reducedMotion, forced: false, canSwitch: true };
}
