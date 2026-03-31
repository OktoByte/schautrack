import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'destructive' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-bold text-sm cursor-pointer',
          'transition-[filter,transform] duration-100 ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0ea5e9] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-40 disabled:saturate-0',
          {
            // Primary: bold gradient — use for the main action on a page
            'bg-gradient-to-br from-[#0ea5e9] to-[#a855f7] text-[#0b0f1c] hover:brightness-110 active:translate-y-px': variant === 'default',
            // Ghost: invisible until hovered — use for secondary/cancel actions
            'bg-transparent text-muted-foreground hover:bg-white/[0.06] hover:text-foreground active:translate-y-px': variant === 'ghost',
            // Destructive: red — use for irreversible/dangerous actions
            'bg-destructive/90 text-white hover:brightness-110 active:translate-y-px': variant === 'destructive',
            // Outline: subtle bordered — use for secondary actions that need more presence than ghost
            'bg-white/[0.05] text-foreground border border-border hover:bg-white/[0.09] active:translate-y-px': variant === 'outline',
          },
          {
            'h-9 px-4': size === 'default',
            'h-8 px-3 text-xs': size === 'sm',
            'h-11 px-6': size === 'lg',
            'h-9 w-9 p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };
export default Button;
