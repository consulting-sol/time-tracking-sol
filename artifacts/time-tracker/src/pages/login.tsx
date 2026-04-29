import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function LoginPage() {
  const { login, setPassword } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword_] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "set-password">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      if (err?.code === "no_password") {
        setMode("set-password");
      } else {
        setError(err?.message ?? "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await setPassword(email, newPassword);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Failed to set password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <div className="bg-white rounded-2xl shadow-xl w-[440px] max-w-full overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <img src="/oikos-logo.png" alt="oikos Solar" className="h-12 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground text-center mb-1">
            {mode === "set-password" ? "Set Your Password" : "Sign in"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {mode === "set-password"
              ? "Your account has no password yet. Choose one to continue."
              : "oikos Solar Time Tracker"}
          </p>

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword_(e.target.value)}
                  required
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full rounded-full bg-[#FFC700] text-black hover:bg-[#FFC700]/90 font-semibold"
                disabled={loading}
                data-testid="btn-login"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                Setting password for <strong>{email}</strong>
              </p>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  data-testid="input-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  data-testid="input-confirm-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full rounded-full bg-[#FFC700] text-black hover:bg-[#FFC700]/90 font-semibold"
                disabled={loading}
                data-testid="btn-set-password"
              >
                {loading ? "Saving…" : "Set Password & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={() => { setMode("login"); setError(""); }}
              >
                Back to sign in
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
