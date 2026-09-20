/** 版本切换与“恢复为新版本”操作。 */
import { GitCommitHorizontal, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VersionBrief } from '@/lib/atoms';

interface VersionSwitcherProps {
  versions: VersionBrief[];
  activeSeq: number | null;
  readOnly?: boolean;
  restoring?: boolean;
  onSelect: (seq: number) => void;
  onRestore: (seq: number) => void;
}

export default function VersionSwitcher({
  versions,
  activeSeq,
  readOnly = false,
  restoring = false,
  onSelect,
  onRestore,
}: VersionSwitcherProps) {
  if (!versions.length) return null;
  const active = versions.find((version) => version.seq === activeSeq);

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
        <GitCommitHorizontal className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        {versions.map((version) => (
          <button
            key={version.seq}
            type="button"
            onClick={() => onSelect(version.seq)}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] transition-colors',
              activeSeq === version.seq
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300',
            )}
          >
            v{version.seq}
            {version.status === 'failed' && <span className="ml-1 text-rose-400">✕</span>}
            {version.status === 'cancelled' && <span className="ml-1 text-amber-400">⊘</span>}
          </button>
        ))}
      </div>
      {active?.status === 'succeeded' && !readOnly && (
        <button
          type="button"
          disabled={restoring}
          onClick={() => onRestore(active.seq)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 bg-transparent px-2 py-1 text-[11px] text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 disabled:opacity-50"
          title={`将 v${active.seq} 恢复为新的最新版本`}
        >
          <RotateCcw className={cn('h-3 w-3', restoring && 'animate-spin')} />
          恢复
        </button>
      )}
    </div>
  );
}
