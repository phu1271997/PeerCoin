import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: userAddress,
  });
}

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x731e5800dfc5689B7B5b93D1634f335464513Ab3') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0x5cBf00F1effeae8A5062c3029eda8E826b5C7ebE') as `0x${string}`;
