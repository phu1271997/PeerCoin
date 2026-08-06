import React from 'react';

export const PaperCardSkeleton: React.FC = () => {
  return (
    <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl animate-pulse">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="h-5 w-14 rounded-full bg-slate-800" />
          <div className="h-3 w-8 rounded bg-slate-800" />
        </div>
        <div className="h-5 w-20 rounded-full bg-slate-800" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 w-4/5 rounded bg-slate-800" />
        <div className="h-5 w-3/5 rounded bg-slate-800" />
      </div>
      <div className="space-y-1.5 mb-4">
        <div className="h-3 w-full rounded bg-slate-800/70" />
        <div className="h-3 w-full rounded bg-slate-800/70" />
        <div className="h-3 w-2/3 rounded bg-slate-800/70" />
      </div>
      <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-3 w-24 rounded bg-slate-800" />
          <div className="h-3 w-16 rounded bg-slate-800" />
        </div>
        <div className="h-3 w-16 rounded bg-slate-800" />
      </div>
    </div>
  );
};

export const PaperGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <PaperCardSkeleton key={i} />
      ))}
    </div>
  );
};
