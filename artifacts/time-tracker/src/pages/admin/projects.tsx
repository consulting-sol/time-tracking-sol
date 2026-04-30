import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListProjects, getListProjectsQueryKey, useCreateProject, useUpdateProject, useDeleteProject, useListClients, getListClientsQueryKey, Project } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, FolderKanban } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientId: z.coerce.number().nullable().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProjectFormValues = z.infer<typeof projectSchema>;

export function AdminProjectsPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

  const { data: projects, isLoading } = useListProjects({}, { query: { queryKey: getListProjectsQueryKey() } });
  const { data: clients } = useListClients({ query: { queryKey: getListClientsQueryKey() } });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      clientId: null,
      description: "",
      isActive: true,
    },
  });

  const createMutation = useCreateProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project created successfully" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsModalOpen(false);
        form.reset();
      }
    }
  });

  const updateMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsModalOpen(false);
        setEditingProject(null);
        form.reset();
      }
    }
  });

  const deleteMutation = useDeleteProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setProjectToDelete(null);
      },
      onError: () => {
        toast({
          title: "Cannot delete project",
          description: "This project has time entries associated with it. Mark it inactive instead.",
          variant: "destructive"
        });
        setProjectToDelete(null);
      }
    }
  });

  const toggleStatusMutation = useUpdateProject({
    mutation: {
      onSuccess: () => {
        toast({ title: "Project status updated" });
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
      }
    }
  });

  function onSubmit(data: ProjectFormValues) {
    if (editingProject) {
      updateMutation.mutate({ id: editingProject.id, data });
    } else {
      createMutation.mutate({ data });
    }
  }

  function openCreateModal() {
    setEditingProject(null);
    form.reset({ name: "", clientId: null, description: "", isActive: true });
    setIsModalOpen(true);
  }

  function openEditModal(project: Project) {
    setEditingProject(project);
    form.reset({
      name: project.name,
      clientId: project.clientId ?? null,
      description: project.description || "",
      isActive: project.isActive,
    });
    setIsModalOpen(true);
  }

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pt-[4.5rem] md:p-8 md:pt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Manage Projects</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">Create, edit, and organize client projects.</p>
          </div>
          <Button onClick={openCreateModal} data-testid="btn-create-project" className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Button>
        </div>

        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/20">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-10">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Project Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hidden sm:table-cell">Client</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground hidden sm:table-cell">Total Hours</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-3 w-3 rounded-full mx-auto" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4 hidden sm:table-cell"><Skeleton className="h-4 w-16 ml-auto" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : projects && projects.length > 0 ? (
                  projects.map(project => (
                    <tr key={project.id} className="border-b transition-colors hover:bg-muted/50 group">
                      <td className="p-4 align-middle text-center">
                        <div
                          className={`w-3 h-3 rounded-full mx-auto ${project.isActive ? 'bg-green-500' : 'bg-slate-300'}`}
                          title={project.isActive ? "Active" : "Inactive"}
                        />
                      </td>
                      <td className="p-4 align-middle">
                        <div className="font-semibold text-foreground">{project.name}</div>
                        {project.clientName && (
                          <div className="text-xs text-muted-foreground mt-0.5 sm:hidden">{project.clientName}</div>
                        )}
                        {project.description && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 hidden sm:block">{project.description}</div>}
                      </td>
                      <td className="p-4 align-middle font-medium text-muted-foreground hidden sm:table-cell">{project.clientName || '—'}</td>
                      <td className="p-4 align-middle text-right font-medium hidden sm:table-cell">{Number(project.totalHours ?? 0).toFixed(1)}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground text-xs px-2 hidden sm:inline-flex"
                            onClick={() => toggleStatusMutation.mutate({
                              id: project.id,
                              data: { isActive: !project.isActive }
                            })}
                            data-testid={`btn-toggle-project-${project.id}`}
                          >
                            {project.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEditModal(project)}
                            data-testid={`btn-edit-project-${project.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setProjectToDelete(project.id)}
                            data-testid={`btn-delete-project-${project.id}`}
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
                          <FolderKanban className="h-6 w-6" />
                        </div>
                        <p className="text-base font-medium text-foreground mb-1">No projects found</p>
                        <p className="text-sm">Create a project to start logging time against it.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              {editingProject ? "Update the details for this project." : "Add a new project for consultants to log time against."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp Rebrand" {...field} data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client (Optional)</FormLabel>
                    <Select
                      value={field.value != null ? String(field.value) : "none"}
                      onValueChange={v => field.onChange(v === "none" ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="input-project-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No client</SelectItem>
                        {clients?.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief project description" {...field} data-testid="input-project-desc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="input-project-active"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active Project</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Allow consultants to log time to this project
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="btn-save-project">
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Project"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the project. Note: Projects that have associated time entries cannot be deleted, you must deactivate them instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => projectToDelete && deleteMutation.mutate({ id: projectToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
