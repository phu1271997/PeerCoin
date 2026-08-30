import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';

/**
 * ENS resolution against Ethereum mainnet.
 *
 * GenLayer studionet has no ENS registry — but every wallet address is a
 * standard EVM address that MAY have an ENS reverse record on mainnet.
 * Resolving there gives us a human-readable name for the same identity.
 *
 * Rate-limited public RPC. Results are cached in-module for the session.
 */
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

const cache = new Map<string, string | null>();
const pending = new Map<string, Promise<string | null>>();

export async function resolveEnsName(addr: string): Promise<string | null> {
  if (!addr || !addr.startsWith('0x') || addr.length !== 42) return null;
  const key = addr.toLowerCase();
  if (cache.has(key)) return cache.get(key)!;
  if (pending.has(key)) return pending.get(key)!;

  const p = (async () => {
    try {
      const name = await mainnetClient.getEnsName({ address: addr as `0x${string}` });
      cache.set(key, name);
      return name;
    } catch {
      cache.set(key, null);
      return null;
    } finally {
      pending.delete(key);
    }
  })();
  pending.set(key, p);
  return p;
}

export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || '';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
