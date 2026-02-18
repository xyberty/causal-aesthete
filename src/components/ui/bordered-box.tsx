import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const borderedBoxVariants = cva(
  "rounded-xl border border-neutral-200 p-3 dark:border-neutral-800",
  {
    variants: {
      variant: {
        default: "",
        filled: "bg-neutral-50 dark:bg-neutral-900/40",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BorderedBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof borderedBoxVariants> {}

const BorderedBox = React.forwardRef<HTMLDivElement, BorderedBoxProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(borderedBoxVariants({ variant }), className)}
      {...props}
    />
  )
);
BorderedBox.displayName = "BorderedBox";

export { BorderedBox, borderedBoxVariants };
