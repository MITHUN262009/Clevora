import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Eye, EyeOff, Clock3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [
    { title: "Sign in — Clevora" },
    { name: "description", content: "Sign in to your private Clevora student workspace." },
    { property: "og:title", content: "Sign in — Clevora" },
    { property: "og:description", content: "Your secure Clevora student workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleEmail(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Account created. Sign in to continue.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await navigate({ to: "/app" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to continue");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error.message);
      setLoading(false);
      return;
    }
    if (!result.redirected) await navigate({ to: "/app" });
  }

  return (
    <div className="clevora-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div className="float-one absolute -right-24 -top-24 h-96 w-72 rounded-[44px] bg-glass ring-1 ring-glass-border backdrop-blur-2xl" />
      <div className="float-two absolute -left-24 bottom-12 h-72 w-56 rounded-[40px] bg-livid-soft/40 ring-1 ring-glass-border backdrop-blur-2xl" />
      <main className="glass-panel relative z-10 w-full max-w-sm rounded-[28px] p-6">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><Clock3 /></div>
        <h1 className="mt-4 text-center font-display text-3xl font-extrabold">Clevora</h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">Plan, study, track and grow.</p>
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-secondary/65 p-1">
          {(["signin", "signup"] as const).map((item) => (
            <Button key={item} type="button" variant={mode === item ? "default" : "ghost"} className="rounded-lg shadow-none" onClick={() => setMode(item)}>
              {item === "signin" ? "Sign in" : "Sign up"}
            </Button>
          ))}
        </div>
        <form className="mt-5 space-y-3" onSubmit={handleEmail}>
          {mode === "signup" && <Input className="h-11 rounded-xl bg-glass-strong" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />}
          <Input className="h-11 rounded-xl bg-glass-strong" type="email" placeholder="College email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <div className="relative">
            <Input className="h-11 rounded-xl bg-glass-strong pr-11" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
          </div>
          <Button variant="clevora" className="h-11 w-full" disabled={loading}>{loading && <Loader2 className="animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</Button>
        </form>
        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
        <Button variant="glass" className="h-11 w-full" onClick={handleGoogle} disabled={loading}><span className="font-bold">G</span> Continue with Google</Button>
        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Your plans, notes, and spending are private to your account.</p>
      </main>
    </div>
  );
}
