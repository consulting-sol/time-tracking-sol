import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { exportArbeitsrapport, type ExportEntry } from "@/lib/excel-export";
import { FileSpreadsheet, Loader2 } from "lucide-react";

interface ProjectOption { id: number; name: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All entries of the current user (unfiltered); the dialog filters by project + period itself */
  entries: (ExportEntry & { projectId?: number })[] | undefined;
  projects: ProjectOption[] | undefined;
  studentName: string;
  defaultProjectId?: string; // "all" or id
}

const LS_LECTURER = "arbeitsrapport.lecturer";
const LS_YEAR = "arbeitsrapport.projectYear";

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Default period: academic year (Sep–Aug) containing today */
function defaultPeriod(): { from: string; to: string; year: string } {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from: `${startYear}-09`,
    to: `${startYear + 1}-08`,
    year: `${startYear}/${startYear + 1}`,
  };
}

export function ArbeitsrapportExportDialog({ open, onOpenChange, entries, projects, studentName, defaultProjectId }: Props) {
  const { toast } = useToast();
  const dp = useMemo(defaultPeriod, []);
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "all");
  const [fromMonth, setFromMonth] = useState(dp.from);
  const [toMonth, setToMonth] = useState(dp.to);
  const [projectYear, setProjectYear] = useState(dp.year);
  const [lecturer, setLecturer] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setProjectId(defaultProjectId ?? "all");
    try {
      setLecturer(localStorage.getItem(LS_LECTURER) ?? "");
      setProjectYear(localStorage.getItem(LS_YEAR) ?? dp.year);
    } catch { /* storage unavailable */ }
  }, [open, defaultProjectId, dp.year]);

  // The HSG form always names the organisation, regardless of which internal project is exported.
  const projectName = "oikos Solar";

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => projectId === "all" || e.projectId?.toString() === projectId);
  }, [entries, projectId]);

  const inPeriod = useMemo(() => {
    const from = fromMonth, to = toMonth;
    return filtered.filter((e) => {
      const m = e.date.slice(0, 7);
      return m >= from && m <= to;
    });
  }, [filtered, fromMonth, toMonth]);
  const totalHours = inPeriod.reduce((s, e) => s + Number(e.hours), 0);

  async function handleExport() {
    setBusy(true);
    try {
      try {
        localStorage.setItem(LS_LECTURER, lecturer);
        localStorage.setItem(LS_YEAR, projectYear);
      } catch { /* ignore */ }
      await exportArbeitsrapport({
        entries: inPeriod,
        studentName,
        projectName,
        projectYear,
        lecturerName: lecturer,
        fromMonth,
        toMonth,
      });
      toast({ title: "Arbeitsrapport exported", description: `${inPeriod.length} entries, ${totalHours.toFixed(1)}h` });
      onOpenChange(false);
    } catch (err) {
      toast({ title: "Export failed", description: err instanceof Error ? err.message : String(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Arbeitsrapport</DialogTitle>
          <DialogDescription>
            Fills the HSG Campus Credits template with your entries. One sheet per month, descriptions of the same day are combined.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Entries from</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger data-testid="select-export-project"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="export-from">From month</Label>
              <Input id="export-from" type="month" value={fromMonth} onChange={(e) => setFromMonth(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="export-to">To month</Label>
              <Input id="export-to" type="month" value={toMonth} onChange={(e) => setToMonth(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="export-year">Project year (as shown on the form)</Label>
            <Input id="export-year" value={projectYear} onChange={(e) => setProjectYear(e.target.value)} placeholder="2025/2026" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="export-lecturer">Supervising lecturer</Label>
            <Input id="export-lecturer" value={lecturer} onChange={(e) => setLecturer(e.target.value)} placeholder="Prof. Dr. …" />
          </div>

          <p className="text-sm text-muted-foreground">
            {inPeriod.length} {inPeriod.length === 1 ? "entry" : "entries"} · {totalHours.toFixed(1)}h in this period
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={handleExport} disabled={busy || inPeriod.length === 0 || !fromMonth || !toMonth} data-testid="btn-export-arbeitsrapport">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
