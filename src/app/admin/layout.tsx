import { Suspense } from "react";
import { Navbar } from "@/components/admin/Navbar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Suspense>
        <Navbar />
      </Suspense>
      <div className="container mx-auto max-w-[920px] px-4">
        <main>
          <div className="border-x border-border min-h-[calc(100vh-57px)] p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
