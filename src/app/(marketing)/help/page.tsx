import type { Metadata } from "next";
import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { HelpCircle, Mail, MessageSquare, BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Help & Support — Trexo",
  description: "Get assistance, explore guides, and contact support for Trexo.",
};

const HELP_TOPICS = [
  {
    icon: BookOpen,
    title: "Quickstart Guide",
    description: "Learn the fundamentals of creating workspaces, sprint planning, and managing issues.",
  },
  {
    icon: MessageSquare,
    title: "Real-time Collaboration",
    description: "Understand instant updates, mentions, reactions, and live team indicators.",
  },
  {
    icon: HelpCircle,
    title: "Account & Security",
    description: "Manage your email verification, OAuth providers, sessions, and notification settings.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <FadeIn>
        <div className="space-y-4 text-center sm:text-left">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary">Support Center</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">How can we help?</h1>
          <p className="text-lg text-muted-foreground">Find answers, learn workflows, and get in touch with our team.</p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {HELP_TOPICS.map((topic, index) => {
            const Icon = topic.icon;
            return (
              <div
                key={index}
                className="group relative rounded-2xl border border-border/50 bg-card p-6 shadow-xs transition-all hover:border-border hover:shadow-sm"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-4 text-base font-semibold text-foreground">{topic.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-border/60 bg-muted/30 p-8 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Still need help?</h2>
              <p className="text-sm text-muted-foreground">Our support team is available to help resolve any issues.</p>
            </div>
            <Button asChild className="gap-2 shrink-0">
              <Link href="mailto:support@trexo.app">
                <Mail className="size-4" />
                Contact Support
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
