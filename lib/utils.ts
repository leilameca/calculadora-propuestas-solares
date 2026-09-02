import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function hexToRgbTriplet(hex: string, fallback = "15 76 92") {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  return `${parseInt(clean.slice(0, 2), 16)} ${parseInt(clean.slice(2, 4), 16)} ${parseInt(clean.slice(4, 6), 16)}`;
}
