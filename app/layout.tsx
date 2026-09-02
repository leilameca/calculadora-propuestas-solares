import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelioPro | Propuestas solares",
  description: "SaaS multiempresa para dimensionamiento y propuestas solares en República Dominicana",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body className="min-h-screen antialiased">{children}</body></html>;
}
