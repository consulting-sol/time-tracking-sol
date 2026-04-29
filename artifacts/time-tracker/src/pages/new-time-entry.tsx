import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateTimeEntry, useListProjects, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ChevronLeft } from "lucide-react";
import { format } from "date-fns";

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

  const { data: projects } = useListProjects(
    { activeOnly: true }, 
    { query: { queryKey: getListProjectsQueryKey({ activeOnly: true }) } }
  );

  const form = useForm<TimeEntryFormValues>({
    resolver: zodResolver(timeEntrySchema),
    defaultValues: {
      projectId: 0,
      date: format(new Date(), "yyyy-MM-dd"),
      hours: 1,
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
      onError: (error) => {
        toast({ 
          title: "Failed to log time", 
          description: "An error occurred. Please try again.",
          variant: "destructive" 
        });
      }
    }
  });

  function onSubmit(data: TimeEntryFormValues) {
    createMutation.mutate({ data });
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
            <h1 className="text-3xl font-bold tracking-tight">Log Time</h1>
            <p className="text-muted-foreground mt-1">Record your hours worked on a project.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Time Entry Details</CardTitle>
              <CardDescription>Fill out the form below to log your time.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="projectId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value ? field.value.toString() : ""}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-project">
                                <SelectValue placeholder="Select a project" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {projects?.map(p => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                  </div>

                  <FormField
                    control={form.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem className="max-w-[200px]">
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.25" min="0.25" max="24" {...field} data-testid="input-hours" />
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
                            data-testid="input-description"
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
                      disabled={createMutation.isPending}
                      data-testid="btn-submit-time"
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