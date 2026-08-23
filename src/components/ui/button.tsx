import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { DitherGradient } from "@/components/dither-kit/gradient"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "relative isolate overflow-hidden text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-[1px]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border/70 bg-transparent hover:bg-secondary/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-secondary/50",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4",
        lg: "h-11 rounded-lg px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedVariant = variant ?? "default"
    return (
      <Comp
        className={cn(buttonVariants({ variant: resolvedVariant, size, className }), asChild && resolvedVariant === "default" && "bg-primary")}
        ref={ref}
        {...props}
      >
        {resolvedVariant === "default" && !asChild && (
          <DitherGradient from="green" to="purple" direction="right" opacity={0.95} className="-z-10" />
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
