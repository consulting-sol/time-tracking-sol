import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function HomePage() {
  return (
    <div className="flex flex-col min-h-[100dvh] bg-black text-white">
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/10">
        <div className="flex items-center">
          <img src="/logo.webp" alt="oikos Solar" className="h-12 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" className="text-white hover:text-black hover:bg-white" asChild>
            <Link href="/sign-in" data-testid="link-home-signin">Sign In</Link>
          </Button>
          <Button className="bg-[#FFC700] text-black hover:bg-[#FFC700]/90 rounded-full px-6 font-semibold" asChild>
            <Link href="/sign-up" data-testid="link-home-signup">Get Started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <div className="mb-8">
          <img src="/logo.webp" alt="oikos Solar" className="h-32 w-auto object-contain mx-auto mb-6 opacity-90" />
        </div>
        <h1 className="text-5xl md:text-6xl font-heading tracking-wide text-white max-w-3xl mb-6 uppercase">
          Time Tracking for oikos Solar
        </h1>
        <p className="text-lg text-white/60 max-w-xl mb-10">
          Log consulting hours, monitor project health, and keep your student organization running with confidence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" className="h-12 px-10 text-base bg-[#FFC700] text-black hover:bg-[#FFC700]/90 rounded-full font-bold" asChild>
            <Link href="/sign-up" data-testid="btn-home-cta-signup">Create Account</Link>
          </Button>
          <Button size="lg" variant="outline" className="h-12 px-10 text-base border-white/30 text-white hover:bg-white hover:text-black rounded-full" asChild>
            <Link href="/sign-in" data-testid="btn-home-cta-signin">Sign In</Link>
          </Button>
        </div>
      </main>

      <footer className="py-6 text-center border-t border-white/10 text-sm text-white/30">
        <p>&copy; {new Date().getFullYear()} oikos Solar. All rights reserved.</p>
      </footer>
    </div>
  );
}
