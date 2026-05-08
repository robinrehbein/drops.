const MAX = 200;

type Entry = { t: number; level: 'info' | 'warn' | 'error'; msg: string };

const ring: Entry[] = [];

export function logDebug(level: Entry['level'], msg: string): void {
  ring.push({ t: Date.now(), level, msg });
  if (ring.length > MAX) ring.shift();
}

export function exportDebugLog(): string {
  return ring
    .map((e) => `${new Date(e.t).toISOString()} [${e.level}] ${e.msg}`)
    .join('\n');
}
