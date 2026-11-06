import React from "react";
import { Loader2 } from "lucide-react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
  icon,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <section
      className={cx(
        "rounded-2xl border border-line bg-surface shadow-xl shadow-black/40 transition duration-200 hover:border-[#38414a]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {icon && <span className="text-volt">{icon}</span>}
            <div className="min-w-0">
              <h2 className="truncate font-display text-lg tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="text-xs font-semibold uppercase tracking-wider text-muted">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line/50 pb-6">
      <div className="max-w-4xl">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-volt">
            <span className="h-0.5 w-5 bg-volt" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl uppercase tracking-tight text-ink leading-[0.92]">
          {title}
        </h1>
        <p className="mt-3 text-base text-muted leading-relaxed">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

type Tone = "neutral" | "ok" | "warn" | "bad" | "brand" | "volt" | "bfs" | "dfs" | "ucs";
const toneClass: Record<Tone, string> = {
  neutral: "border-line bg-raised text-ink",
  ok: "border-[#38c982]/40 bg-[#38c982]/15 text-[#38c982]",
  warn: "border-[#ffd23e]/40 bg-[#ffd23e]/15 text-[#ffd23e]",
  bad: "border-[#ff5a63]/40 bg-[#ff5a63]/15 text-[#ff5a63]",
  brand: "border-volt/40 bg-volt/15 text-volt",
  volt: "border-volt/40 bg-volt/15 text-volt",
  bfs: "border-[#4b8cff]/50 bg-[#4b8cff]/15 text-[#7db0ff]",
  dfs: "border-[#38c982]/50 bg-[#38c982]/15 text-[#6ee7b7]",
  ucs: "border-[#ff5a63]/50 bg-[#ff5a63]/15 text-[#fca5a5]",
};

export function Pill({
  tone = "neutral",
  children,
  dot,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider",
        toneClass[tone],
        className,
      )}
    >
      {dot && <span className="h-2 w-2 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 transition duration-200 hover:border-[#38414a]">
      <div className="text-xs font-extrabold uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className={cx("mt-1.5 font-display text-3xl sm:text-4xl tabular-nums tracking-tight text-ink", tone)}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs font-medium text-muted">{hint}</div>}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "secondary",
  disabled,
  icon,
  title,
  className,
  type = "button",
  active,
  ...rest
}: {
  children?: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  disabled?: boolean;
  icon?: React.ReactNode;
  title?: string;
  className?: string;
  type?: "button" | "submit";
  active?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type" | "title" | "disabled" | "className" | "children">) {
  const styles = {
    primary:
      "bg-volt text-[#0a0b0c] hover:bg-volt-dim border-volt shadow-lg shadow-volt/20 font-extrabold uppercase tracking-wider hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-raised text-ink hover:bg-[#202529] border-line hover:border-volt/60 font-bold hover:-translate-y-0.5 active:translate-y-0",
    ghost:
      "bg-transparent text-muted hover:bg-raised hover:text-ink border-transparent font-bold",
    danger:
      "bg-[#ff5a63]/15 text-[#ff5a63] hover:bg-[#ff5a63]/25 border-[#ff5a63]/40 font-bold",
  }[variant];

  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
        styles,
        active && "ring-2 ring-volt/70 border-volt",
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-muted">
      <Loader2 className="h-4 w-4 animate-spin text-volt" /> {label}
    </span>
  );
}

export function LegendItem({
  color,
  label,
  shape = "square",
  dashed,
}: {
  color: string;
  label: string;
  shape?: "square" | "line" | "circle";
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-bold text-ink">
      {shape === "line" ? (
        <span
          className="inline-block h-1.5 w-6 rounded"
          style={{
            background: dashed
              ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 8px)`
              : color,
          }}
        />
      ) : (
        <span
          className={cx(
            "inline-block h-3.5 w-3.5 border border-white/20 shadow-sm",
            shape === "circle" ? "rounded-full" : "rounded-[3px]",
          )}
          style={{ background: color }}
        />
      )}
      {label}
    </span>
  );
}

export function LegendGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-muted">{title}</div>
      <div className="flex flex-wrap gap-x-6 gap-y-2.5">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
      <div className="font-display text-2xl uppercase tracking-tight text-ink">{title}</div>
      <p className="max-w-md text-sm text-muted leading-relaxed">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
