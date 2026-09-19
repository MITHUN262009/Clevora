import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Clevora — Make Student Life Simpler" },
    { name: "description", content: "Plan classes, capture notes, track attendance and manage student life in one calm space." },
    { property: "og:title", content: "Clevora — Make Student Life Simpler" },
    { property: "og:description", content: "The premium student planner for your entire college day." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Index,
});

// IMPORTANT: Replace this placeholder. See ./README.md for routing conventions.
function Index() {
  return (
    <div className="clevora-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="float-one absolute -right-24 -top-28 h-96 w-72 rounded-[44px] bg-glass ring-1 ring-glass-border backdrop-blur-2xl" />
      <div className="float-two absolute -left-24 bottom-8 h-72 w-56 rounded-[40px] bg-livid-soft/40 ring-1 ring-glass-border backdrop-blur-2xl" />
      <main className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="glass-panel grid size-24 place-items-center rounded-[28px]">
          <div className="grid size-16 place-items-center rounded-[20px] bg-primary text-primary-foreground shadow-xl"><Sparkles className="size-8" /></div>
        </div>
        <h1 className="mt-7 font-display text-5xl font-extrabold text-foreground">Clevora</h1>
        <p className="mt-3 text-lg font-medium text-foreground">Make Student Life Simpler.</p>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Your classes, tasks, notes, attendance, spending, and campus life—beautifully organized.</p>
        <Button asChild variant="clevora" size="lg" className="mt-8 h-12 w-full rounded-2xl">
          <Link to="/auth">Start planning <ArrowRight /></Link>
        </Button>
      </main>
    </div>
  );
}
