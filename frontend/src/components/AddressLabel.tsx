import React, { useEffect, useState } from 'react';
import { resolveEnsName, shortAddress } from '../lib/ens';

interface AddressLabelProps {
  address: string;
  className?: string;
  showFull?: boolean; // when true, show the ENS name AND the shortened address
}

/**
 * Renders an address as its mainnet ENS name when one exists, falling back
 * to the shortened 0x… form. The full hex address stays available on hover
 * via the title attribute.
 *
 * ENS lookups run against Ethereum mainnet — GenLayer studionet has no ENS
 * of its own. Every EVM address is portable, so a reverse record on mainnet
 * still identifies the same wallet across chains.
 */
export const AddressLabel: React.FC<AddressLabelProps> = ({ address, className = '', showFull = false }) => {
  const [ens, setEns] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveEnsName(address).then((name) => {
      if (!cancelled) setEns(name);
    });
    return () => { cancelled = true; };
  }, [address]);

  const display = ens || shortAddress(address);
  return (
    <span className={className} title={address}>
      {display}
      {showFull && ens && (
        <span className="ml-1.5 opacity-50 text-[10px] font-mono">({shortAddress(address)})</span>
      )}
    </span>
  );
};
