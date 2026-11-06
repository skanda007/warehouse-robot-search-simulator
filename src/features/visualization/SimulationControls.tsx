"use client";

import React from "react";
import { ChevronsRight, Pause, Play, RotateCcw, SkipBack, StepBack, StepForward, Zap } from "lucide-react";
import { useStore } from "@/store/useStore";
import { usePlayback } from "@/hooks/usePlayback";
import { SPEEDS } from "@/lib/playback";
import { Button, cx } from "@/components/common/ui";

export function SimulationControls() {
  const result = useStore((s) => s.result);
  const t = useStore((s) => s.t);
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const running = useStore((s) => s.running);
  const { play, pause, next, prev, reset, replay, final, seek, setSpeed, runSearch } = useStore.getState();
  const view = usePlayback();
  const has = !!result;
  const pctSearch = view.total ? (view.E / view.total) * 100 : 100;

  const label = !has
    ? "No search executed — click Start"
    : view.inExecution
      ? `Robot route · cell ${view.robotIdx + 1} of ${view.P}`
      : `Search event ${view.searchStep + 1} of ${view.E}`;

  return (
    <div className="space-y-4" data-testid="simulation-controls">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          icon={<Zap className="h-4 w-4" />}
          onClick={() => (has ? replay() : void runSearch())}
          disabled={running}
          data-testid="ctl-start"
        >
          {running ? "Searching…" : "Start"}
        </Button>
        {playing ? (
          <Button icon={<Pause className="h-4 w-4" />} onClick={pause} data-testid="ctl-pause">
            Pause
          </Button>
        ) : (
          <Button icon={<Play className="h-4 w-4" />} onClick={play} disabled={!has} data-testid="ctl-play">
            Play
          </Button>
        )}
        <Button icon={<StepBack className="h-4 w-4" />} onClick={prev} disabled={!has || t === 0} title="Previous step" data-testid="ctl-prev">
          Prev
        </Button>
        <Button icon={<StepForward className="h-4 w-4" />} onClick={() => { pause(); next(); }} disabled={!has || t >= view.total - 1} title="Next step" data-testid="ctl-next">
          Next
        </Button>
        <Button icon={<SkipBack className="h-4 w-4" />} onClick={reset} disabled={!has} data-testid="ctl-reset">
          Reset
        </Button>
        <Button icon={<RotateCcw className="h-4 w-4" />} onClick={replay} disabled={!has} data-testid="ctl-replay">
          Replay
        </Button>
        <Button icon={<ChevronsRight className="h-4 w-4" />} onClick={final} disabled={!has} data-testid="ctl-final">
          Final
        </Button>
        <div className="ml-auto flex items-center gap-1.5" role="group" aria-label="Playback speed">
          <span className="mr-1 text-xs font-extrabold uppercase tracking-wider text-muted">Speed:</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              className={cx(
                "rounded-md border px-2.5 py-1 text-xs font-black tabular-nums transition",
                speed === s ? "border-volt bg-volt text-[#0a0b0c]" : "border-line bg-raised text-ink hover:border-volt/60",
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between text-xs font-extrabold uppercase tracking-wider">
          <span className="text-ink font-mono" data-testid="timeline-label">{label}</span>
          {has && (
            <span className="text-muted">
              <span className="text-[#ffd23e]">STAGE A · SEARCH EXPLORATION</span> → <span className="text-[#38c982]">STAGE B · AMR ROUTE</span>
            </span>
          )}
        </div>
        <div className="relative">
          {has && (
            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-2 -translate-y-1/2 overflow-hidden rounded-full bg-raised border border-line">
              <div className="h-full bg-[#ffd23e]/50" style={{ width: `${pctSearch}%` }} />
              <div className="h-full flex-1 bg-[#38c982]/50" />
            </div>
          )}
          <input
            type="range"
            aria-label="Search step slider"
            data-testid="timeline-slider"
            min={0}
            max={Math.max(0, view.total - 1)}
            value={Math.min(t, Math.max(0, view.total - 1))}
            disabled={!has}
            onChange={(e) => seek(Number(e.target.value))}
            className="relative z-10 h-6 w-full cursor-pointer bg-transparent disabled:opacity-40"
          />
        </div>
      </div>
    </div>
  );
}
