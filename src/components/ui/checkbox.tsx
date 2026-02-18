import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  type?: "checkbox";
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, type = "checkbox", ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-4 w-4 rounded border border-neutral-300 dark:border-neutral-700 accent-neutral-900 dark:accent-neutral-50",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
