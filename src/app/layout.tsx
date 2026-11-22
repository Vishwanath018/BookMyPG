import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BookMyPG | Find Your Perfect PG Stay",
  description: "Discover, compare and book verified PG accommodations across India.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
