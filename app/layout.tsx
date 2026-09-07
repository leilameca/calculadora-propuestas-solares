import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HelioPro | Propuestas solares",
  description: "SaaS multiempresa para dimensionamiento y propuestas solares en República Dominicana",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `(function(){try{var saved=localStorage.getItem('heliopro-theme');var dark=saved?saved==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',dark);document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}})()`;
  return <html lang="es" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body className="min-h-screen antialiased">{children}</body></html>;
}
