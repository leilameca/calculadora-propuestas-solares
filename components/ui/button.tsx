import * as React from "react";
import { cn } from "@/lib/utils";

export function Button({ className, variant = "default", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "outline" | "ghost" }) {
  return <button className={cn("inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50", variant === "default" && "bg-primary text-white hover:bg-primary/90", variant === "outline" && "border bg-white hover:bg-slate-50", variant === "ghost" && "hover:bg-slate-100", className)} {...props} />;
}
