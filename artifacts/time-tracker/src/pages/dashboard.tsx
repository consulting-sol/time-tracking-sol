import { useGetMySummary, getGetMySummaryQueryKey, useListTimeEntries, getListTimeEntriesQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Clock, Plus, FolderKanban, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useGetMySummary(
    {},
    { query: { queryKey: getGetMySummaryQueryKey({}) } }
  );

  const { data: recentEntries, isLoading: isLoadingEntries } = useListTimeEntries(
    {},
    { query: { queryKey: getListTimeEntriesQueryKey({}) } }
  );

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] md:p-8 md:pt-8">
        <div className="flex items-start justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Overview of your tracked time and active projects.</p>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/time-entries/new" data-testid="btn-dashboard-log-time">
              <Plus className="mr-1.5 h-4 w-4" /> Log Time
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                <div className="text-2xl font-bold">{Number(summary?.totalHours ?? 0).toFixed(1)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <div className="text-2xl font-bold">{summary?.totalEntries || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? (
                <Skeleton className="h-7 w-full" />
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {summary?.projectBreakdown && summary.projectBreakdown.length > 0 ? (
                    summary.projectBreakdown.map(p => (
                      <div key={p.projectId} className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-full font-medium">
                        {p.projectName} ({p.totalHours}h)
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No active projects</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <h2 className="text-lg md:text-xl font-semibold tracking-tight mb-4">Recent Time Entries</h2>
        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Description</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Hours</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoadingEntries ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-64" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    </tr>
                  ))
                ) : recentEntries && recentEntries.length > 0 ? (
                  recentEntries.slice(0, 5).map(entry => (
                    <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle whitespace-nowrap text-xs sm:text-sm">{format(new Date(entry.date), "MMM d, yyyy")}</td>
                      <td className="p-4 align-middle font-medium text-xs sm:text-sm">{entry.projectName}</td>
                      <td className="p-4 align-middle truncate max-w-[300px] hidden sm:table-cell">{entry.description}</td>
                      <td className="p-4 align-middle text-right font-medium">{entry.hours.toFixed(1)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-muted-foreground">
                      No recent time entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
