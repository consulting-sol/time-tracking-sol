import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { DashboardPage } from "./pages/dashboard";
import { TimeEntriesPage } from "./pages/time-entries";
import { NewTimeEntryPage } from "./pages/new-time-entry";
import { EditTimeEntryPage } from "./pages/edit-time-entry";
import { AdminAnalyticsPage } from "./pages/admin/analytics";
import { AdminTimeEntriesPage } from "./pages/admin/time-entries";
import { AdminClientsPage } from "./pages/admin/clients";
import { AdminProjectsPage } from "./pages/admin/projects";
import { AdminUsersPage } from "./pages/admin/users";
import { HomePage } from "./pages/home";
import NotFoundPage from "./pages/not-found";
import { Toaster } from "@/components/ui/toaster";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || "/" : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  variables: {
    colorPrimary: "#FFC700",
    colorForeground: "#0D0D0D",
    colorMutedForeground: "#666666",
    colorDanger: "hsl(0, 84.2%, 60.2%)",
    colorBackground: "#ffffff",
    colorInput: "#e5e5e5",
    colorInputForeground: "#0D0D0D",
    colorNeutral: "#e5e5e5",
    fontFamily: "'Epilogue', sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold tracking-tight text-foreground",
    headerSubtitle: "text-sm text-muted-foreground",
    socialButtonsBlockButtonText: "text-sm font-medium",
    formFieldLabel: "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    footerActionLink: "text-[#FFC700] hover:text-[#FFC700]/80 underline-offset-4 hover:underline",
    footerActionText: "text-sm text-muted-foreground",
    dividerText: "text-xs text-muted-foreground uppercase",
    identityPreviewEditButton: "text-sm text-[#FFC700] hover:underline",
    formFieldSuccessText: "text-sm font-medium text-green-600",
    alertText: "text-sm font-medium text-destructive",
    logoBox: "h-16 flex justify-center mb-2",
    logoImage: "h-16 w-auto object-contain",
    socialButtonsBlockButton: "w-full border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md h-10 px-4 py-2",
    formButtonPrimary: "w-full bg-[#FFC700] text-black hover:bg-[#FFC700]/90 rounded-full h-10 px-4 py-2 font-semibold",
    formFieldInput: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC700] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
    footerAction: "mt-4 text-center text-sm",
    dividerLine: "bg-border h-px w-full",
    alert: "bg-destructive/10 text-destructive border border-destructive/20 rounded-md p-3",
    otpCodeFieldInput: "h-10 w-10 text-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
    formFieldRow: "space-y-2 mb-4",
    main: "flex flex-col gap-y-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);
  return null;
}

function UserSyncer() {
  const { user } = useUser();
  useEffect(() => {
    if (user) {
      fetch('/api/users/sync', { method: 'POST', credentials: 'include' }).catch(console.error);
    }
  }, [user?.id]);
  return null;
}

function HomeRedirect() {
  return <Redirect to="/dashboard" />;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <UserSyncer />
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/time-entries" component={TimeEntriesPage} />
          <Route path="/time-entries/new" component={NewTimeEntryPage} />
          <Route path="/time-entries/:id/edit" component={EditTimeEntryPage} />
          <Route path="/admin/analytics" component={AdminAnalyticsPage} />
          <Route path="/admin/time-entries" component={AdminTimeEntriesPage} />
          <Route path="/admin/clients" component={AdminClientsPage} />
          <Route path="/admin/projects" component={AdminProjectsPage} />
          <Route path="/admin/users" component={AdminUsersPage} />
          <Route component={NotFoundPage} />
        </Switch>
        <Toaster />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;