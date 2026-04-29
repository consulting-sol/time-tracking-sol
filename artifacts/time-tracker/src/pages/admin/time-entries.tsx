import { useState } from "react";
import { useListTimeEntries, getListTimeEntriesQueryKey, useListProjects, getListProjectsQueryKey, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Clock } from "lucide-react";

export function AdminTimeEntriesPage() {
  const [projectIdFilter, setProjectIdFilter] = useState<string>("all");
  const [userIdFilter, setUserIdFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: projects } = useListProjects({}, { query: { queryKey: getListProjectsQueryKey() } });
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  const queryParams = {
    ...(projectIdFilter !== "all" ? { projectId: parseInt(projectIdFilter) } : {}),
    ...(userIdFilter !== "all" ? { userId: userIdFilter } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const { data: entries, isLoading } = useListTimeEntries(
    queryParams,
    { query: { queryKey: getListTimeEntriesQueryKey(queryParams) } }
  );

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Organization Time Entries</h1>
          <p className="text-muted-foreground mt-1">View and filter all logged hours across the organization.</p>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Project</label>
              <Select value={projectIdFilter} onValueChange={setProjectIdFilter}>
                <SelectTrigger data-testid="select-admin-filter-project">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Consultant</label>
              <Select value={userIdFilter} onValueChange={setUserIdFilter}>
                <SelectTrigger data-testid="select-admin-filter-user">
                  <SelectValue placeholder="All Consultants" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Consultants</SelectItem>
                  {users?.map(u => (
                    <SelectItem key={u.clerkId} value={u.clerkId}>{u.displayName || u.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">From Date</label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} data-testid="input-admin-date-from" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">To Date</label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} data-testid="input-admin-date-to" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/20">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Consultant</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Project</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Hours</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-64" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
                    </tr>
                  ))
                ) : entries && entries.length > 0 ? (
                  entries.map(entry => (
                    <tr key={entry.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="p-4 align-middle whitespace-nowrap">{format(new Date(entry.date), "MMM d, yyyy")}</td>
                      <td className="p-4 align-middle font-medium">{entry.userDisplayName || 'Unknown User'}</td>
                      <td className="p-4 align-middle font-medium">{entry.projectName}</td>
                      <td className="p-4 align-middle">{entry.description}</td>
                      <td className="p-4 align-middle text-right font-bold">{entry.hours.toFixed(1)}</td>
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
                        <p className="text-sm">Try adjusting your filters.</p>
                      </div>
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