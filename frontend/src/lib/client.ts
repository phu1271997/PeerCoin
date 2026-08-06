import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: userAddress,
  });
}

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0xEcBb6500a9582A470Cd6f8A5BBd825Bf3d735Ae9') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0x0AEe9Fe2d39272eA73976Bcca4284EC6E9f1291E') as `0x${string}`;
