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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium text-sm transition-colors cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-primary text-white hover:bg-primary/85 active:bg-primary/75': variant === 'default',
            'bg-transparent text-muted-foreground border border-border hover:bg-white/[0.04] hover:text-foreground': variant === 'ghost',
            'bg-destructive text-white hover:bg-destructive/85 active:bg-destructive/75': variant === 'destructive',
            'border border-border bg-white/[0.03] text-foreground hover:bg-white/[0.06]': variant === 'outline',
          },
          {
            'h-9 px-4': size === 'default',
            'h-9 px-3': size === 'sm',
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
