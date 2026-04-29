import { useState, useMemo } from "react";
import { useGetAnalyticsSummary, getGetAnalyticsSummaryQueryKey, useGetTimeByProject, getGetTimeByProjectQueryKey, useGetTimeByUser, getGetTimeByUserQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, FolderKanban, Users, List } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Input } from "@/components/ui/input";

type GroupBy = "project" | "client" | "consultant";

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
  { value: "project", label: "By Project" },
  { value: "client", label: "By Client" },
  { value: "consultant", label: "By Consultant" },
];

const CHART_COLOR: Record<GroupBy, string> = {
  project: "#FFC700",
  client: "#FF9500",
  consultant: "#FFE066",
};

export function AdminAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupBy>("project");

  const params = {
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  };

  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary(
    params,
    { query: { queryKey: getGetAnalyticsSummaryQueryKey(params) } }
  );

  const { data: projectHours, isLoading: isLoadingProjectHours } = useGetTimeByProject(
    params,
    { query: { queryKey: getGetTimeByProjectQueryKey(params) } }
  );

  const { data: userHours, isLoading: isLoadingUserHours } = useGetTimeByUser(
    params,
    { query: { queryKey: getGetTimeByUserQueryKey(params) } }
  );

  const clientHours = useMemo(() => {
    if (!projectHours) return [];
    const map: Record<string, number> = {};
    for (const p of projectHours) {
      const key = p.clientName || "No Client";
      map[key] = (map[key] || 0) + Number(p.totalHours);
    }
    return Object.entries(map)
      .map(([clientName, totalHours]) => ({ clientName, totalHours }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }, [projectHours]);

  const chartData = groupBy === "project"
    ? (projectHours ?? []).map(r => ({ label: r.projectName, totalHours: Number(r.totalHours) }))
    : groupBy === "client"
    ? clientHours.map(r => ({ label: r.clientName, totalHours: r.totalHours }))
    : (userHours ?? []).map(r => ({ label: r.displayName || r.email || "Unknown", totalHours: Number(r.totalHours) }));

  const isLoadingChart = groupBy === "consultant" ? isLoadingUserHours : isLoadingProjectHours;

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Analytics</h1>
            <p className="text-muted-foreground mt-1">Metrics across all projects and consultants.</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-background border rounded-md px-3 py-1">
              <span className="text-sm font-medium">Filter Range:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-8 border-0 shadow-none focus-visible:ring-0 w-auto px-1"
                data-testid="input-date-from"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-8 border-0 shadow-none focus-visible:ring-0 w-auto px-1"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organization Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-20" /> : (
                <div className="text-2xl font-bold">{Number(summary?.totalHours ?? 0).toFixed(1)}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entries Logged</CardTitle>
              <List className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalEntries || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalProjects || 0}</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Consultants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingSummary ? <Skeleton className="h-7 w-16" /> : (
                <div className="text-2xl font-bold">{summary?.totalConsultants || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Hours Breakdown</CardTitle>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
              {GROUP_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGroupBy(opt.value)}
                  data-testid={`btn-group-${opt.value}`}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    groupBy === opt.value
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingChart ? (
              <div className="h-[340px] flex items-center justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 40 }}>
                    <XAxis
                      dataKey="label"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      angle={-30}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}h`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(0,0,0,0.05)" }}
                      formatter={(value: number) => [`${Number(value).toFixed(1)} hours`, "Total Hours"]}
                    />
                    <Bar dataKey="totalHours" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLOR[groupBy]} opacity={1 - i * 0.06} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[340px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                No data available for this view
              </div>
            )}
          </CardContent>
        </Card>

        {groupBy !== "consultant" && projectHours && projectHours.length > 0 && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {groupBy === "client" ? "Client Summary" : "Project Summary"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr className="border-b">
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">
                        {groupBy === "client" ? "Client" : "Project"}
                      </th>
                      {groupBy === "project" && (
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">Client</th>
                      )}
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Entries</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Total Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupBy === "project"
                      ? projectHours.map(r => (
                        <tr key={r.projectId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{r.projectName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.clientName || "—"}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{r.entryCount}</td>
                          <td className="px-4 py-3 text-right font-bold">{Number(r.totalHours).toFixed(1)}h</td>
                        </tr>
                      ))
                      : clientHours.map(r => (
                        <tr key={r.clientName} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{r.clientName}</td>
                          <td className="px-4 py-3 text-right font-bold">{r.totalHours.toFixed(1)}h</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
