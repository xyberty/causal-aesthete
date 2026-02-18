import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const selectClassName =
  "flex h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:border-neutral-700 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-700 disabled:cursor-not-allowed disabled:opacity-50";

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(selectClassName, className)} {...props} />
  )
);
Select.displayName = "Select";

export { Select };
