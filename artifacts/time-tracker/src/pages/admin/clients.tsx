import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListClients, getListClientsQueryKey,
  useCreateClient, useUpdateClient, useDeleteClient,
  Client,
} from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
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

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  description: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function AdminClientsPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  const { data: clients, isLoading } = useListClients({ query: { queryKey: getListClientsQueryKey() } });

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useCreateClient({
    mutation: {
      onSuccess: () => {
        toast({ title: "Client created successfully" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsModalOpen(false);
        form.reset();
      },
    },
  });

  const updateMutation = useUpdateClient({
    mutation: {
      onSuccess: () => {
        toast({ title: "Client updated successfully" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setIsModalOpen(false);
        setEditingClient(null);
        form.reset();
      },
    },
  });

  const deleteMutation = useDeleteClient({
    mutation: {
      onSuccess: () => {
        toast({ title: "Client deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() });
        setClientToDelete(null);
      },
      onError: () => {
        toast({
          title: "Cannot delete client",
          description: "Remove all associated projects first.",
          variant: "destructive",
        });
        setClientToDelete(null);
      },
    },
  });

  function onSubmit(data: ClientFormValues) {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate({ data });
    }
  }

  function openCreateModal() {
    setEditingClient(null);
    form.reset({ name: "", description: "" });
    setIsModalOpen(true);
  }

  function openEditModal(client: Client) {
    setEditingClient(client);
    form.reset({ name: client.name, description: client.description || "" });
    setIsModalOpen(true);
  }

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Clients</h1>
            <p className="text-muted-foreground mt-1">Create and manage client organisations.</p>
          </div>
          <Button onClick={openCreateModal} data-testid="btn-create-client">
            <Plus className="mr-2 h-4 w-4" /> New Client
          </Button>
        </div>

        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/20">
                <tr className="border-b transition-colors">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Client Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Description</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Projects</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Added</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-40" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-64" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-10 ml-auto" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-24 ml-auto" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                    </tr>
                  ))
                ) : clients && clients.length > 0 ? (
                  clients.map(client => (
                    <tr key={client.id} className="border-b transition-colors hover:bg-muted/50 group">
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-semibold">{client.name}</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">
                        {client.description ? (
                          <span className="line-clamp-1">{client.description}</span>
                        ) : (
                          <span className="text-muted-foreground/40 italic">No description</span>
                        )}
                      </td>
                      <td className="p-4 align-middle text-right font-medium">
                        {Number(client.projectCount)}
                      </td>
                      <td className="p-4 align-middle text-right text-muted-foreground whitespace-nowrap">
                        {format(new Date(client.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => openEditModal(client)}
                            data-testid={`btn-edit-client-${client.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setClientToDelete(client.id)}
                            data-testid={`btn-delete-client-${client.id}`}
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
                          <Building2 className="h-6 w-6" />
                        </div>
                        <p className="text-base font-medium text-foreground mb-1">No clients yet</p>
                        <p className="text-sm">Create a client to associate with projects.</p>
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
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Edit Client" : "Create New Client"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Update the details for this client."
                : "Add a new client organisation."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corp" {...field} data-testid="input-client-name" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Brief description of the client" {...field} data-testid="input-client-desc" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="btn-save-client"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Client"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!clientToDelete} onOpenChange={open => !open && setClientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the client. Projects linked to this client will have their client association removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToDelete && deleteMutation.mutate({ id: clientToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete-client"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
