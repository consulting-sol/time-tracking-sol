import { useLocation } from "wouter";
import { Play, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimer, formatElapsed, secondsToQuarterHours } from "@/hooks/use-timer";
import { cn } from "@/lib/utils";

/** Start/stop stopwatch shown in the sidebar. Stopping opens the Log Time form with the hours prefilled. */
export function TimerWidget({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { running, elapsedSeconds, start, stop, discard } = useTimer();
  const [, setLocation] = useLocation();

  function handleStop() {
    const seconds = stop();
    const hours = secondsToQuarterHours(seconds);
    onNavigate?.();
    setLocation(`/time-entries/new?hours=${hours}&timer=${seconds}`);
  }

  function handleDiscard() {
    if (window.confirm("Discard the running timer?")) discard();
  }

  return (
    <div className={cn("mx-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3", className)} data-testid="timer-widget">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Timer</div>
          <div className={cn("font-mono text-lg tabular-nums leading-tight", running ? "text-sidebar-foreground" : "text-sidebar-foreground/40")}>
            {formatElapsed(elapsedSeconds)}
          </div>
        </div>
        {running ? (
          <div className="flex items-center gap-1">
            <Button size="sm" className="h-8 gap-1.5" onClick={handleStop} data-testid="btn-timer-stop">
              <Square className="h-3.5 w-3.5 fill-current" /> Stop
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleDiscard}
              title="Discard timer"
              data-testid="btn-timer-discard"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={start} data-testid="btn-timer-start">
            <Play className="h-3.5 w-3.5 fill-current" /> Start
          </Button>
        )}
      </div>
      {running && (
        <p className="mt-1.5 text-[11px] text-sidebar-foreground/50">
          Stop to log {secondsToQuarterHours(elapsedSeconds).toFixed(2)} h
        </p>
      )}
    </div>
  );
}
