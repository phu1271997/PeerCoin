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

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x8Ffd4Abda597A1A90cB0564aB121E0cb66AE9f0E') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E') as `0x${string}`;
