import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useCreateTimeEntry,
  useListProjects, getListProjectsQueryKey,
  useListClients, getListClientsQueryKey,
} from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, Link, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ChevronLeft, TimerIcon } from "lucide-react";
import { formatElapsed } from "@/hooks/use-timer";
import { format } from "date-fns";

const NO_CLIENT = "__none__";

const timeEntrySchema = z.object({
  projectId: z.coerce.number().min(1, "Please select a project"),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.25, "Minimum 0.25 hours").max(24, "Maximum 24 hours"),
  description: z.string().min(1, "Description is required"),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

export function NewTimeEntryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const search = useSearch();
  const { prefillHours, timerSeconds } = useMemo(() => {
    const params = new URLSearchParams(search);
    const h = Number(params.get("hours"));
    const t = Number(params.get("timer"));
    return {
      prefillHours: Number.isFinite(h) && h > 0 ? Math.min(24, h) : null,
      timerSeconds: Number.isFinite(t) && t > 0 ? t : null,
    };
  }, [search]);

  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const { data: projects } = useListProjects(
    { activeOnly: true },
    { query: { queryKey: getListProjectsQueryKey({ activeOnly: true }) } }
  );

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!selectedClientId) return [];
    if (selectedClientId === NO_CLIENT) return projects.filter(p => !p.clientId);
    return projects.filter(p => p.clientId === Number(selectedClientId));
  }, [projects, selectedClientId]);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      projectId: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      hours: prefillHours ?? 1,
      description: "",
    },
  });

  const createMutation = useCreateTimeEntry({
    mutation: {
      onSuccess: () => {
        toast({ title: "Time entry logged successfully" });
        queryClient.invalidateQueries();
        setLocation("/time-entries");
      },
      onError: () => {
        toast({
          title: "Failed to log time",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      },
    },
  });

  function onSubmit(data: TimeEntryFormValues) {
    createMutation.mutate({ data });
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    form.setValue("projectId", 0);
  }

  const hasNoClientProjects = projects?.some(p => !p.clientId) ?? false;

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] md:p-8 md:pt-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 text-muted-foreground">
              <Link href="/time-entries">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Entries
              </Link>
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Log Time</h1>
            <p className="text-muted-foreground mt-1">Record your hours worked on a project.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time Entry Details</CardTitle>
              <CardDescription>Fill out the form below to log your time.</CardDescription>
            </CardHeader>
            <CardContent>
              {timerSeconds !== null && (
                <div className="mb-6 flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm" data-testid="timer-hint">
                  <TimerIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <div>
                    <span className="font-medium">Timer stopped at {formatElapsed(timerSeconds)}.</span>{" "}
                    <span className="text-muted-foreground">Hours were rounded to the nearest quarter hour – adjust if needed.</span>
                  </div>
                </div>
              )}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Client</label>
                      <Select value={selectedClientId} onValueChange={handleClientChange}>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {clients?.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                          {hasNoClientProjects && (
                            <SelectItem value={NO_CLIENT}>Other / No Client</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select
                            value={field.value ? field.value.toString() : ""}
                            onValueChange={field.onChange}
                            disabled={!selectedClientId}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-project">
                                <SelectValue placeholder={selectedClientId ? "Select a project" : "Select a client first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {filteredProjects.length === 0 ? (
                                <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                                  No active projects for this client
                                </div>
                              ) : (
                                filteredProjects.map(p => (
                                  <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hours</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.25" min="0.25" max="24" {...field} data-testid="input-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description of Work</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What did you work on?"
                            className="min-h-[100px] resize-y"
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" asChild type="button" className="w-full sm:w-auto">
                      <Link href="/time-entries">Cancel</Link>
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      data-testid="btn-submit-time"
                      className="w-full sm:w-auto"
                    >
                      {createMutation.isPending ? "Saving..." : "Save Time Entry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
