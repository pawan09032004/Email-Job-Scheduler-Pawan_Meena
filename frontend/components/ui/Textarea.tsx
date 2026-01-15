import { TextareaHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  showCharCount?: boolean;
  maxCharCount?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      showCharCount = false,
      maxCharCount,
      className,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [charCount, setCharCount] = useState(
      value ? String(value).length : 0
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            "w-full px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent",
            "transition-all duration-200 resize-none",
            "disabled:bg-slate-100 disabled:cursor-not-allowed",
            error && "border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
        <div className="flex justify-between mt-1">
          <div>{error && <p className="text-sm text-rose-600">{error}</p>}</div>
          {showCharCount && (
            <p className="text-sm text-slate-500">
              {charCount}
              {maxCharCount && `/${maxCharCount}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
