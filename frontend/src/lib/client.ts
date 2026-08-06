import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';

export function makeClient(userAddress: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: userAddress,
  });
}

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0x7E4fA4381C1AaB44d3182c3e484576e0B6Dfe346') as `0x${string}`;
export const REPUTATION_ADDRESS = (import.meta.env.VITE_REPUTATION_ADDRESS || '0x5cBf00F1effeae8A5062c3029eda8E826b5C7ebE') as `0x${string}`;
