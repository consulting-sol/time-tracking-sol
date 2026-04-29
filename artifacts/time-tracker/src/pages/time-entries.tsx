import { useState } from "react";
import { useListTimeEntries, getListTimeEntriesQueryKey, useDeleteTimeEntry, useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Plus, Pencil, Trash2, Search, Filter, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function TimeEntriesPage() {
  const { toast } = useToast();
  const [projectIdFilter, setProjectIdFilter] = useState<string>("all");
  const [entryToDelete, setEntryToDelete] = useState<number | null>(null);

  const { data: projects } = useListProjects(
    { activeOnly: true }, 
    { query: { queryKey: getListProjectsQueryKey({ activeOnly: true }) } }
  );

  const { data: entries, isLoading } = useListTimeEntries(
    projectIdFilter !== "all" ? { projectId: parseInt(projectIdFilter) } : {},
    { 
      query: { 
        queryKey: getListTimeEntriesQueryKey(projectIdFilter !== "all" ? { projectId: parseInt(projectIdFilter) } : {}) 
      } 
    }
  );

  const deleteMutation = useDeleteTimeEntry({
    mutation: {
      onSuccess: () => {
        toast({ title: "Entry deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListTimeEntriesQueryKey() });
        setEntryToDelete(null);
      },
      onError: () => {
        toast({ title: "Failed to delete entry", variant: "destructive" });
        setEntryToDelete(null);
      }
    }
  });

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Time Entries</h1>
            <p className="text-muted-foreground mt-1">View and manage your logged hours.</p>
          </div>
          <Button asChild>
            <Link href="/time-entries/new" data-testid="btn-entries-new">
              <Plus className="mr-2 h-4 w-4" /> Log Time
            </Link>
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2 max-w-xs w-full">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={projectIdFilter} onValueChange={setProjectIdFilter}>
              <SelectTrigger data-testid="select-filter-project">
                <SelectValue placeholder="Filter by Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map(p => (
                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/20">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Hours</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-full" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : entries && entries.length > 0 ? (
                  entries.map(entry => (
                    <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50 group">
                      <td className="p-4 align-middle whitespace-nowrap">{format(new Date(entry.date), "MMM d, yyyy")}</td>
                      <td className="p-4 align-middle font-medium">{entry.projectName}</td>
                      <td className="p-4 align-middle">{entry.description}</td>
                      <td className="p-4 align-middle text-right font-medium">{entry.hours.toFixed(1)}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" asChild>
                            <Link href={`/time-entries/${entry.id}/edit`} data-testid={`btn-edit-entry-${entry.id}`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setEntryToDelete(entry.id)}
                            data-testid={`btn-delete-entry-${entry.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-muted p-3 rounded-full mb-4">
                          <Clock className="h-6 w-6" />
                        </div>
                        <p className="text-base font-medium text-foreground mb-1">No time entries found</p>
                        <p className="text-sm">You haven't logged any time for this selection yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this time entry.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => entryToDelete && deleteMutation.mutate({ id: entryToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Entry"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}