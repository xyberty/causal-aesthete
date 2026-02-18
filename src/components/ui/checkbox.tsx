import * as React from "react";
import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  type?: "checkbox";
  /** Main label/title shown next to the checkbox */
  label?: React.ReactNode;
  /** Optional description rendered as muted text below the label (pass as children) */
  children?: React.ReactNode;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, type = "checkbox", label, children: description, ...props }, ref) => {
    const input = (
      <input
        type={type}
        ref={ref}
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-neutral-300 dark:border-neutral-700 accent-neutral-900 dark:accent-neutral-50",
          className
        )}
        {...props}
      />
    );

    if (label === undefined) {
      return input;
    }

    return (
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        {input}
        <span className="flex flex-col gap-0.5 leading-tight">
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {label}
          </span>
          {description != null && description !== "" && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </span>
          )}
        </span>
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
