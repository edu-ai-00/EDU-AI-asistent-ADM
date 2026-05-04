import type { Metadata } from "next";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "EDU Admin - Správa kurzů",
  description: "Správa vzdělávacích kurzů a bloků",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
