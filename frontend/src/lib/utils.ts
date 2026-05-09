import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  if (amount % 1 === 0) {
    return `${amount} TMT`;
  }
  return `${amount.toFixed(2)} TMT`;
}

export function getLocalizedName(
  name: Record<string, string>,
  lang: string,
): string {
  return name[lang] || name["en"] || Object.values(name)[0] || "";
}
