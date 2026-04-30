import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Clock, FileText, BarChart3, List, FolderKanban, Users, Building2, LogOut, Menu, X } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: me } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });

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
    <div className="flex flex-col h-full">
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
                onClick={onNavigate}
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
                  onClick={onNavigate}
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

      <div className="p-4 border-t border-sidebar-border flex items-center gap-3">
        <div className="flex flex-col overflow-hidden flex-1">
          <span className="text-sm font-medium truncate text-sidebar-foreground">{me?.displayName || me?.firstName || me?.email}</span>
          <span className="text-xs capitalize text-sidebar-foreground/50">{me?.role}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => logout()}
          title="Sign out"
          data-testid="btn-logout"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className={cn("hidden md:flex pb-4 min-h-[100dvh] w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border", className)}>
        <NavContent />
      </div>

      {/* Mobile fixed top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-3 gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <img src="/logo.webp" alt="oikos Solar" className="h-8 w-auto object-contain" />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border [&>button]:hidden">
          <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border">
            <img src="/logo.webp" alt="oikos Solar" className="h-8 w-auto object-contain" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <NavContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
