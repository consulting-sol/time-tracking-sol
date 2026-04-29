import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 mr-2 text-primary">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="font-bold text-xl tracking-tight">TimeTracker</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/sign-in" data-testid="link-home-signin">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up" data-testid="link-home-signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24 bg-slate-50 dark:bg-slate-900/20">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-3xl mb-6">
          Professional Time Tracking for Student Consultancies
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mb-10">
          Streamline your consulting operations. Track billable hours, monitor project health, and run your organization with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="h-12 px-8 text-base" asChild>
            <Link href="/sign-up" data-testid="btn-home-cta-signup">Create Account</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
            <Link href="/sign-in" data-testid="btn-home-cta-signin">Sign In</Link>
          </Button>
        </div>
      </main>

      <footer className="py-6 text-center border-t text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} TimeTracker. All rights reserved.</p>
      </footer>
    </div>
  );
}