import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clock, FileText, BarChart3, List, FolderKanban, Users } from "lucide-react";
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
    { href: "/admin/projects", label: "Projects", icon: FolderKanban },
    { href: "/admin/users", label: "Users", icon: Users },
  ];

  return (
    <div className={cn("pb-12 border-r bg-card min-h-[100dvh] w-64 flex flex-col", className)}>
      <div className="space-y-4 py-4 flex-1">
        <div className="px-3 py-2">
          <div className="flex items-center mb-6 pl-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 mr-2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <h2 className="text-lg font-semibold tracking-tight">
              TimeTracker
            </h2>
          </div>
          <div className="space-y-1">
            {consultantLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                  location === link.href ? "bg-muted text-primary" : "text-muted-foreground"
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
            <h2 className="mb-2 px-4 text-xs font-semibold uppercase tracking-tight text-muted-foreground">
              Administration
            </h2>
            <div className="space-y-1">
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                    location === link.href ? "bg-muted text-primary" : "text-muted-foreground"
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
      
      <div className="p-4 border-t mt-auto flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <UserButton />
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{me?.displayName || me?.firstName || me?.email}</span>
            <span className="text-xs text-muted-foreground capitalize">{me?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}