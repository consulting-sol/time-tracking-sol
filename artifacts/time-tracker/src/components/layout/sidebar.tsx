import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clock, FileText, BarChart3, List, FolderKanban, Users, Building2 } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { UserButton } from "@clerk/react";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { data: me } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey()
    }
  });

  const consultantLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/time-entries", label: "My Time Entries", icon: Clock },
    { href: "/time-entries/new", label: "Log Time", icon: FileText },
  ];

  const adminLinks = [
    { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/admin/time-entries", label: "All Entries", icon: List },
    { href: "/admin/clients", label: "Clients", icon: Building2 },
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  return (
    <div className={cn("pb-4 min-h-[100dvh] w-64 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <div className="flex items-center mb-6 pl-2">
            <img src="/logo.webp" alt="oikos Solar" className="h-12 w-auto object-contain" />
          </div>
          <div className="space-y-1">
            {consultantLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                  location === link.href
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`link-sidebar-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {me?.role === "admin" && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Administration
            </h2>
            <div className="space-y-1">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all",
                    location === link.href
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`link-sidebar-admin-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-sidebar-border mt-auto flex items-center gap-3">
        <UserButton />
        <div className="flex flex-col overflow-hidden">
          <span className="text-sm font-medium truncate text-sidebar-foreground">{me?.displayName || me?.firstName || me?.email}</span>
          <span className="text-xs capitalize text-sidebar-foreground/50">{me?.role}</span>
        </div>
      </div>
    </div>
  );
}
