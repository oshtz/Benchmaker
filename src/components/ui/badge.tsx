import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { DitherGradient } from "@/components/dither-kit/gradient"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "relative isolate overflow-hidden border-transparent text-white shadow-sm",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive",
        outline: "border-border/60 text-foreground bg-background/50",
        success: "border-transparent bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/10 text-amber-600 dark:text-amber-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const resolvedVariant = variant ?? "default"
  return (
    <div className={cn(badgeVariants({ variant: resolvedVariant }), className)} {...props}>
      {resolvedVariant === "default" && (
        <DitherGradient from="green" to="purple" direction="right" opacity={0.9} className="-z-10" />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }
