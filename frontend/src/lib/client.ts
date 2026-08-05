import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: userAddress,
  });
}

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`;
