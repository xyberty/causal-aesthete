import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency: string) {
  // Use Intl if available. Fallback to simple formatting.
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function ymKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function addMonths(date: Date, months: number) {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  d.setMonth(targetMonth);
  return d;
}

export function toISODateOnly(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Human-readable date for achieved items (e.g. "13 Feb 2025"). */
export function formatAchievedDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return isoString.slice(0, 10);
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return isoString.slice(0, 10);
  }
}

/** Get available months for target month selection: plan months + 3 months after last calculated month. */
export function getAvailableMonths(
  planMonths: string[],
  startDate: string,
  maxMonths: number
): string[] {
  const monthSet = new Set<string>(planMonths);
  
  // Find the last month in the plan
  let lastMonth: Date | null = null;
  if (planMonths.length > 0) {
    const sorted = [...planMonths].sort();
    const lastKey = sorted[sorted.length - 1];
    const [year, month] = lastKey.split("-").map(Number);
    lastMonth = new Date(year, month - 1, 1);
  } else {
    // If no plan months, start from startDate
    lastMonth = new Date(startDate + "T00:00:00");
  }
  
  // Add 3 months after the last calculated month
  for (let i = 1; i <= 3; i++) {
    const nextMonth = addMonths(lastMonth, i);
    monthSet.add(ymKeyFromDate(nextMonth));
  }
  
  // Also ensure we include months from startDate up to maxMonths
  // const start = new Date(startDate + "T00:00:00");
  // for (let m = 0; m < maxMonths; m++) {
  //   const monthDate = addMonths(start, m);
  //   monthSet.add(ymKeyFromDate(monthDate));
  // }
  
  return [...monthSet].sort();
}
