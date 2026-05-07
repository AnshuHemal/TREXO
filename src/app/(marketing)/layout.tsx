import { Header } from "@/components/shared/header";
import { Footer } from "./_components/footer";

/**
 * Marketing layout — wraps all public-facing pages with the sticky header
 * and the site footer.
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
      <Footer />
    </div>
  );
}
