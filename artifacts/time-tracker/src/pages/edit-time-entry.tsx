import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useGetTimeEntry, getGetTimeEntryQueryKey,
  useUpdateTimeEntry,
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
import { useLocation, Link, useParams } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const NO_CLIENT = "__none__";

const timeEntrySchema = z.object({
  projectId: z.coerce.number().min(1, "Please select a project"),
  date: z.string().min(1, "Date is required"),
  hours: z.coerce.number().min(0.25, "Minimum 0.25 hours").max(24, "Maximum 24 hours"),
  description: z.string().min(1, "Description is required"),
});

type TimeEntryFormValues = z.infer<typeof timeEntrySchema>;

export function EditTimeEntryPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });
  const { data: projects } = useListProjects(
    { activeOnly: true },
    { query: { queryKey: getListProjectsQueryKey({ activeOnly: true }) } }
  );

  const { data: entry, isLoading } = useGetTimeEntry(
    id,
    { query: { queryKey: getGetTimeEntryQueryKey(id), enabled: !!id } }
  );

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    if (!selectedClientId) return projects;
    if (selectedClientId === NO_CLIENT) return projects.filter(p => !p.clientId);
    return projects.filter(p => p.clientId === Number(selectedClientId));
  }, [projects, selectedClientId]);

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      projectId: 0,
      date: "",
      hours: 1,
      description: "",
    },
  });

  useEffect(() => {
    if (entry && projects) {
      form.reset({
        projectId: entry.projectId,
        date: entry.date,
        hours: entry.hours,
        description: entry.description,
      });
      const project = projects.find(p => p.id === entry.projectId);
      if (project) {
        setSelectedClientId(project.clientId ? String(project.clientId) : NO_CLIENT);
      }
    }
  }, [entry, projects, form]);

  const updateMutation = useUpdateTimeEntry({
    mutation: {
      onSuccess: () => {
        toast({ title: "Time entry updated successfully" });
        queryClient.invalidateQueries();
        setLocation("/time-entries");
      },
      onError: () => {
        toast({
          title: "Failed to update time entry",
          variant: "destructive",
        });
      },
    },
  });

  function onSubmit(data: TimeEntryFormValues) {
    if (id) {
      updateMutation.mutate({ id, data });
    }
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    form.setValue("projectId", 0);
  }

  const hasNoClientProjects = projects?.some(p => !p.clientId) ?? false;

  if (isLoading && !entry) {
    return (
      <div className="flex min-h-[100dvh] bg-muted/40">
        <Sidebar />
        <main className="flex-1 p-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-[400px] w-full max-w-2xl" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild className="-ml-3 mb-2 text-muted-foreground">
              <Link href="/time-entries">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Entries
              </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Time Entry</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Update Details</CardTitle>
              <CardDescription>Modify your existing time entry.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Client selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none">Client</label>
                      <Select value={selectedClientId} onValueChange={handleClientChange}>
                        <SelectTrigger data-testid="select-client-edit">
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

                    {/* Project selector filtered by client */}
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
                              <SelectTrigger data-testid="select-project-edit">
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

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-date-edit" className="max-w-[200px]" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem className="max-w-[200px]">
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.25" min="0.25" max="24" {...field} data-testid="input-hours-edit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                            data-testid="input-description-edit"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <Button variant="outline" asChild type="button">
                      <Link href="/time-entries">Cancel</Link>
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="btn-submit-edit-time"
                    >
                      {updateMutation.isPending ? "Saving..." : "Update Entry"}
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
