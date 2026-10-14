import React, { useEffect } from "react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { TimerProvider } from "./hooks/use-timer";
import { DashboardPage } from "./pages/dashboard";
import { TimeEntriesPage } from "./pages/time-entries";
import { NewTimeEntryPage } from "./pages/new-time-entry";
import { EditTimeEntryPage } from "./pages/edit-time-entry";
import { AdminAnalyticsPage } from "./pages/admin/analytics";
import { AdminTimeEntriesPage } from "./pages/admin/time-entries";
import { AdminClientsPage } from "./pages/admin/clients";
import { AdminProjectsPage } from "./pages/admin/projects";
import { AdminUsersPage } from "./pages/admin/users";
import { LoginPage } from "./pages/login";
import NotFoundPage from "./pages/not-found";
import { Toaster } from "@/components/ui/toaster";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      setLocation("/sign-in");
    }
  }, [isLoaded, isSignedIn, setLocation]);

  if (!isLoaded) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!isSignedIn) return null;
  return <Component />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/">{() => <Redirect to="/dashboard" />}</Route>
      <Route path="/sign-in" component={LoginPage} />
      <Route path="/dashboard">{() => <ProtectedRoute component={DashboardPage} />}</Route>
      <Route path="/time-entries">{() => <ProtectedRoute component={TimeEntriesPage} />}</Route>
      <Route path="/time-entries/new">{() => <ProtectedRoute component={NewTimeEntryPage} />}</Route>
      <Route path="/time-entries/:id/edit">{() => <ProtectedRoute component={EditTimeEntryPage} />}</Route>
      <Route path="/admin/analytics">{() => <ProtectedRoute component={AdminAnalyticsPage} />}</Route>
      <Route path="/admin/time-entries">{() => <ProtectedRoute component={AdminTimeEntriesPage} />}</Route>
      <Route path="/admin/clients">{() => <ProtectedRoute component={AdminClientsPage} />}</Route>
      <Route path="/admin/projects">{() => <ProtectedRoute component={AdminProjectsPage} />}</Route>
      <Route path="/admin/users">{() => <ProtectedRoute component={AdminUsersPage} />}</Route>
      <Route component={NotFoundPage} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TimerProvider>
            <Routes />
            <Toaster />
          </TimerProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
