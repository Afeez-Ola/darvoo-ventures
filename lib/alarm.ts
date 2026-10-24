"use client";

// Loud, clear kitchen beep made with the Web Audio API (no sound file needed).
let ctx: AudioContext | null = null;

/** Must run from a tap once, because browsers block sound until the user interacts. */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return true;
  } catch {
    return false;
  }
}

/** Three rising double beeps, about 2 seconds. */
export function beep() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    for (const [j, f] of [[0, 880], [1, 1320]] as const) {
      const t0 = now + i * 0.6 + j * 0.18;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "square";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.17);
    }
  }
  try { navigator.vibrate?.([300, 120, 300, 120, 300]); } catch {}
}
