import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { permissionState, requestNotifPermission, hasAskedPermission } from '../lib/notifications';

/**
 * One-shot banner asking for browser notification permission after wallet
 * connect. Only appears when:
 *   - Notification API is supported
 *   - User has never been asked before (per localStorage flag)
 *   - Permission is still 'default'
 *
 * Auto-hides once granted, denied, or dismissed. Dismiss stays until the
 * user clears storage — no re-prompt spam.
 */
export const NotificationPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const state = permissionState();
    if (state === 'default' && !hasAskedPermission()) {
      setVisible(true);
    }
  }, []);

  const grant = async () => {
    await requestNotifPermission();
    setVisible(false);
  };

  const dismiss = () => {
    try {
      localStorage.setItem('peercoin_notif_permission_asked', '1');
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
      <div className="p-3 rounded-xl bg-gradient-to-r from-teal-950/60 to-slate-900 border border-teal-500/30 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex-shrink-0">
            <Bell className="w-4 h-4" />
          </div>
          <div className="text-xs text-slate-300 leading-relaxed">
            <span className="font-semibold text-slate-100">Enable browser notifications</span>
            <span className="text-slate-400"> — get an alert when your preprint reaches an AI-jury verdict, so you can claim without polling the page.</span>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={grant}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 text-xs font-bold hover:opacity-90 transition"
          >
            Enable
          </button>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
