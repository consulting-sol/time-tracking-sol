import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useListUsers, getListUsersQueryKey, useInviteUser, useUpdateUser, useDeleteUser, UserRole } from "@workspace/api-client-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, ShieldAlert, Trash2, Users as UsersIcon } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "consultant"]),
});

type InviteFormValues = z.infer<typeof inviteSchema>;

export function AdminUsersPage() {
  const { toast } = useToast();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const { data: users, isLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "consultant",
    },
  });

  const inviteMutation = useInviteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "Invitation sent", description: "They will receive an email to set up their account." });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsInviteOpen(false);
        form.reset();
      },
      onError: (err: any) => {
        toast({ 
          title: "Failed to send invitation", 
          description: err?.message || "There was an error sending the invitation.",
          variant: "destructive" 
        });
      }
    }
  });

  const updateRoleMutation = useUpdateUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User role updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    }
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        toast({ title: "User deleted successfully" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setUserToDelete(null);
      },
      onError: () => {
        toast({ title: "Failed to delete user", variant: "destructive" });
        setUserToDelete(null);
      }
    }
  });

  function onInviteSubmit(data: InviteFormValues) {
    inviteMutation.mutate({ data });
  }

  function toggleRole(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "consultant" : "admin";
    updateRoleMutation.mutate({ 
      clerkId: userId, 
      data: { role: newRole as "admin" | "consultant" } 
    });
  }

  return (
    <div className="flex min-h-[100dvh] bg-muted/40">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
            <p className="text-muted-foreground mt-1">Manage consultants and administrators.</p>
          </div>
          <Button onClick={() => setIsInviteOpen(true)} data-testid="btn-invite-user">
            <Plus className="mr-2 h-4 w-4" /> Add Team Member
          </Button>
        </div>

        <Card>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b bg-muted/20">
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Email</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Role</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Total Hours</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                      <td className="p-4"><Skeleton className="h-4 w-12 ml-auto" /></td>
                      <td className="p-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : users && users.length > 0 ? (
                  users.map(user => (
                    <tr key={user.clerkId} className="border-b transition-colors hover:bg-muted/50 group">
                      <td className="p-4 align-middle font-medium text-foreground">
                        {user.displayName || (user.firstName ? `${user.firstName} ${user.lastName || ''}` : '—')}
                      </td>
                      <td className="p-4 align-middle text-muted-foreground">{user.email}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize font-normal tracking-wide">
                          {user.role}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right font-medium">{Number(user.totalHours ?? 0).toFixed(1)}</td>
                      <td className="p-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground"
                            onClick={() => toggleRole(user.clerkId, user.role)}
                            disabled={updateRoleMutation.isPending}
                            data-testid={`btn-toggle-role-${user.clerkId}`}
                          >
                            {user.role === 'admin' ? (
                              <><Shield className="mr-1.5 h-3.5 w-3.5" /> Make Consultant</>
                            ) : (
                              <><ShieldAlert className="mr-1.5 h-3.5 w-3.5 text-orange-500" /> Make Admin</>
                            )}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setUserToDelete(user.clerkId)}
                            data-testid={`btn-delete-user-${user.clerkId}`}
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
                          <UsersIcon className="h-6 w-6" />
                        </div>
                        <p className="text-base font-medium text-foreground mb-1">No users found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              They will receive an email with a link to set up their password and access the app.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="jane@example.com" {...field} data-testid="input-user-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-role">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="consultant">Consultant</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} data-testid="btn-submit-user">
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this user account. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="btn-cancel-delete-user">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => userToDelete && deleteMutation.mutate({ clerkId: userToDelete })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="btn-confirm-delete-user"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}