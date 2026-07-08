import { forwardRef, useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, className = "", id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error}
        className={`h-11 w-full rounded-2xl border-2 border-border bg-card px-4 text-sm text-ink placeholder:text-muted transition-all duration-200 focus:border-ink focus:shadow-offset-xs focus:outline-none ${error ? "border-accent" : ""} ${className}`}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs font-semibold text-accent">{error}</p>}
    </div>
  );
});
