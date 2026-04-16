import { Header } from "@/components/shared/header";

/**
 * Marketing layout — wraps all public-facing pages (landing, pricing, etc.)
 * with the sticky header. Footer can be added here later.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
