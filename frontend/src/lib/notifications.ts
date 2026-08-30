import { makeClient, CONTRACT_ADDRESS } from './client';

const PERM_KEY = 'peercoin_notif_permission_asked';
const SNAPSHOT_KEY = 'peercoin_paper_snapshot_v1';

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export function permissionState(): NotifPermission {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotifPermission;
}

export async function requestNotifPermission(): Promise<NotifPermission> {
  if (typeof Notification === 'undefined') return 'unsupported';
  try {
    localStorage.setItem(PERM_KEY, '1');
  } catch { /* ignore */ }
  const result = await Notification.requestPermission();
  return result as NotifPermission;
}

export function hasAskedPermission(): boolean {
  try {
    return localStorage.getItem(PERM_KEY) === '1';
  } catch {
    return false;
  }
}

function fire(title: string, body: string, tag: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: '/logo-512.png',
      badge: '/logo-512.png',
    });
  } catch {
    /* browser blocked (e.g. Safari on mobile) */
  }
}

interface PaperSnapshot {
  id: string;
  state: string;
  ai_verdict: string;
}

function readSnapshot(): Record<string, PaperSnapshot> {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writeSnapshot(snap: Record<string, PaperSnapshot>): void {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
  } catch { /* ignore */ }
}

/**
 * Poll list_papers, compare against the last snapshot in localStorage, and
 * fire a browser notification for every paper that JUST transitioned to
 * FINALIZED or FAILED since the previous check. Silent-safe when notifications
 * are unsupported or denied. Only notifies about papers the user AUTHORED —
 * outsiders' papers do not spam them.
 */
export async function checkAndNotifyFinalized(userAddress: string): Promise<void> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  if (!userAddress) return;

  try {
    const client = makeClient(userAddress as `0x${string}`);
    const res = await client.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'list_papers',
      args: [0, 200],
    }) as any;
    const items: any[] = Array.isArray(res?.items) ? res.items : [];

    const prev = readSnapshot();
    const next: Record<string, PaperSnapshot> = {};

    for (const p of items) {
      const snapshot: PaperSnapshot = { id: p.id, state: p.state, ai_verdict: p.ai_verdict || '' };
      next[p.id] = snapshot;
      if ((p.author || '').toLowerCase() !== userAddress.toLowerCase()) continue;
      const before = prev[p.id];
      if (before && before.state !== 'FINALIZED' && before.state !== 'FAILED' &&
          (p.state === 'FINALIZED' || p.state === 'FAILED')) {
        if (p.state === 'FINALIZED') {
          fire(
            `AI jury verdict: ${p.ai_verdict}`,
            `Your preprint "${(p.title || '').slice(0, 60)}" is now ${p.ai_verdict}. Open PeerCoin to claim.`,
            `finalize-${p.id}`,
          );
        } else {
          fire(
            'Paper FAILED consensus',
            `Your preprint "${(p.title || '').slice(0, 60)}" did not reach consensus. Stakes refundable via claim().`,
            `failed-${p.id}`,
          );
        }
      }
    }
    writeSnapshot(next);
  } catch {
    /* silent — offline / RPC hiccup */
  }
}
