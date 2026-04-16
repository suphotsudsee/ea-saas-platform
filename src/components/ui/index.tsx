import React from 'react';

export function Button({ className, variant, size, ...props }: any) {
  const baseStyles = "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none disabled:opacity-50";
  const variants = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800",
    ghost: "bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-xs",
    lg: "h-12 px-8 text-lg",
    icon: "h-10 w-10",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant || 'default']} ${sizes[size || 'default']} ${className}`} 
      {...props} 
    />
  );
}

export function Input({ className, ...props }: any) {
  return (
    <input 
      className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`} 
      {...props} 
    />
  );
}

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

export function Badge({ className, variant, ...props }: any) {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variants = {
    default: "bg-blue-500 text-white border-transparent",
    outline: "text-slate-400 border-slate-700",
  };
  return <div className={`${base} ${variants[variant || 'default']} ${className}`} {...props} />;
}

export function Table({ children }: any) { return <div className="w-full overflow-auto"><table className="w-full text-sm text-left">{children}</table></div>; }
export function TableHeader({ children }: any) { return <thead className="text-slate-500 uppercase text-xs font-medium">{children}</thead>; }
export function TableRow({ className, ...props }: any) { return <tr className={`border-b border-slate-800 ${className}`} {...props} />; }
export function TableHead({ className, ...props }: any) { return <th className={`px-4 py-3 font-medium ${className}`} {...props} />; }
export function TableBody({ children }: any) { return <tbody>{children}</tbody>; }
export function TableCell({ className, ...props }: any) { return <td className={`px-4 py-3 ${className}`} {...props} />; }
