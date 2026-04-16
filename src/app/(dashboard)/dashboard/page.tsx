import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard home — placeholder until the full app is built.
 * requireUser() is called here too as a defence-in-depth check
 * (layout already guards, but individual pages can also verify).
 */
export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">
        Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="text-muted-foreground">
        {siteConfig.name} dashboard is under construction. Check back soon.
      </p>
    </div>
  );
}
