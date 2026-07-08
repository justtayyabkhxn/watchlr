import { forwardRef, useId } from "react";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ label, className = "", id, ...props }, ref) {
    const autoId = useId();
    const inputId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`min-h-28 w-full rounded-2xl border-2 border-border bg-card p-4 text-sm text-ink placeholder:text-muted transition-all duration-200 focus:border-ink focus:shadow-offset-xs focus:outline-none ${className}`}
          {...props}
        />
      </div>
    );
  },
);
