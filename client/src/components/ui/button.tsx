import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { useThemeStore } from "@/stores/themeStore"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        lightPrimary: 
          "bg-primary/90 text-primary-foreground shadow-md hover:bg-primary hover:shadow-lg",
        lightSecondary: 
          "bg-secondary/90 text-secondary-foreground shadow-sm hover:bg-secondary hover:shadow-md",
        lightOutline: 
          "border border-secondary/30 bg-background shadow-sm hover:bg-secondary/30 hover:text-secondary-foreground hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const { theme } = useThemeStore();
    
    // ライトモードの場合、一部のボタンバリアントを自動的に調整
    let adjustedVariant = variant;
    if (theme === 'light') {
      if (variant === 'default') adjustedVariant = 'lightPrimary';
      if (variant === 'secondary') adjustedVariant = 'lightSecondary';
      if (variant === 'outline') adjustedVariant = 'lightOutline';
    }
    
    return (
      <Comp
        className={cn(buttonVariants({ variant: adjustedVariant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
