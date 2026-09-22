import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pilot Control Console",
  description: "Admin console for controlling pilot users, use cases, and budgets.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
