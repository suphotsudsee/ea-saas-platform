import React from 'react';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';
type BadgeVariant = 'default' | 'outline';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: BadgeVariant;
};

export function Button({ asChild = false, className = '', variant = 'default', size = 'default', children, ...props }: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50";
  const variants: Record<ButtonVariant, string> = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<ButtonSize, string> = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-xs",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10",
  };

  const composedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, {
      className: `${composedClassName} ${children.props.className ?? ''}`,
    });
  }

  return (
    <button className={composedClassName} {...props}>
      {children}
    </button>
  );
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = '', ...props }, ref) {
    return (
      <input 
        ref={ref}
        className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} 
        {...props} 
      />
    );
  }
);

export function Card({ className, ...props }: any) {
  return <div className={`rounded-xl border border-slate-800 bg-slate-900 shadow-sm ${className}`} {...props} />;
}

export function CardHeader({ className, ...props }: any) {
  return <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />;
}

export function CardTitle({ className, ...props }: any) {
  return <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props} />;
}

export function CardDescription({ className, ...props }: any) {
  return <p className={`text-sm text-slate-400 ${className}`} {...props} />;
}

export function CardContent({ className, ...props }: any) {
  return <div className={`p-6 pt-0 ${className}`} {...props} />;
}

export function CardFooter({ className, ...props }: any) {
  return <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />;
}

export function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variants: Record<BadgeVariant, string> = {
    default: "bg-blue-500 text-white border-transparent",
    outline: "text-slate-400 border-slate-700",
  };
  return <div className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Table({ children }: any) { return <div className="w-full overflow-auto"><table className="w-full text-sm text-left">{children}</table></div>; }
export function TableHeader({ children }: any) { return <thead className="text-slate-500 uppercase text-xs font-medium">{children}</thead>; }
export function TableRow({ className, ...props }: any) { return <tr className={`border-b border-slate-800 ${className}`} {...props} />; }
export function TableHead({ className, ...props }: any) { return <th className={`px-4 py-3 font-medium ${className}`} {...props} />; }
export function TableBody({ children }: any) { return <tbody>{children}</tbody>; }
export function TableCell({ className, ...props }: any) { return <td className={`px-4 py-3 ${className}`} {...props} />; }
