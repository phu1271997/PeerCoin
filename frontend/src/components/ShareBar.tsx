import React, { useState } from 'react';
import { Share2, Twitter, Link2, Check, MessageCircle } from 'lucide-react';

interface ShareBarProps {
  paperId: string;
  title: string;
  verdict: string | null; // ACCEPT / REJECT / BORDERLINE / null when unfinalized
  fieldTag: string;
}

/**
 * Social share row for a paper detail page.
 *
 * Buttons:
 *  - X / Twitter (intent URL, no auth)
 *  - Farcaster (Warpcast compose intent, no auth)
 *  - Copy link (navigator.clipboard)
 *  - Native share (Web Share API — mobile Safari / Chrome Android only)
 *
 * All targets open new tab and never leak the connected wallet.
 */
export const ShareBar: React.FC<ShareBarProps> = ({ paperId, title, verdict, fieldTag }) => {
  const [copied, setCopied] = useState(false);
  const url = `https://peercoin-psi.vercel.app/#paper-${paperId}`;

  const verdictText = verdict
    ? verdict === 'ACCEPT'
      ? `✅ On-chain AI jury just ACCEPTED`
      : verdict === 'REJECT'
        ? `🚫 On-chain AI jury REJECTED`
        : `⚖️ On-chain AI jury verdict:`
    : `📄 New preprint under AI-jury review`;
  const composeText = `${verdictText} preprint #${paperId} on @genlayerlabs — "${(title || '').slice(0, 80)}" (${fieldTag}). Skin-in-the-game peer review with an on-chain LLM jury.`;

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(composeText)}&url=${encodeURIComponent(url)}`;
  const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(composeText + ' ' + url)}`;

  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* silent */ }
  };

  const doNativeShare = async () => {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: `PeerCoin — Paper #${paperId}`, text: composeText, url });
      } else {
        doCopy();
      }
    } catch { /* user dismissed */ }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function';

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold uppercase tracking-wider">
        <Share2 className="w-4 h-4 text-teal-400" />
        <span>Share this verdict</span>
      </div>
      <div className="flex items-center space-x-2">
        <a
          href={twitterUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 hover:border-teal-500/40 transition"
          title="Share on X / Twitter"
        >
          <Twitter className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">X / Twitter</span>
        </a>
        <a
          href={farcasterUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 hover:border-teal-500/40 transition"
          title="Share on Farcaster (Warpcast)"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Farcaster</span>
        </a>
        <button
          onClick={doCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-800 hover:border-teal-500/40 transition"
          title="Copy link"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </>
          )}
        </button>
        {canNativeShare && (
          <button
            onClick={doNativeShare}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold hover:opacity-90 transition"
            title="Native share (mobile)"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}
      </div>
    </div>
  );
};
