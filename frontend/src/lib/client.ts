import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

// The genlayer-js chain object bakes in the OLD block explorer URL
// (genlayer-explorer.vercel.app). The correct current explorer is
// explorer-studio.genlayer.com — override so any SDK/wallet consumer
// that reads chain.blockExplorers gets the right one.
const studionetFixed = {
  ...studionet,
  blockExplorers: {
    default: {
      name: 'GenLayer Studio Explorer',
      url: 'https://explorer-studio.genlayer.com',
    },
  },
} as typeof studionet;

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionetFixed,
    account: userAddress,
  });
}

// v0.3 (Governance Layer) — Appeal Court + Tiered Reputation. Redeployed
// 2026-09-08. Old v0.2 fallback (0xCf08...58D9 / 0x0AEe...291E) removed —
// pointing the frontend at v0.2 would revert every appeal / batch_profile
// call because those methods don't exist there.
export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x67037c93B8620EF5b78AeCD72cf793d925284104') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0xb9501EbcdADFf3F4627dEEc3b0b0485a399100D8') as `0x${string}`;
