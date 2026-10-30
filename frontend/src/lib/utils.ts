export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatScore(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${(value * 100).toFixed(0)}%`;
}

export function formatMode(mode: string | null | undefined): string {
  if (!mode) return "—";
  return mode.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat().format(value);
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function scoreTone(score: number): {
  text: string;
  bar: string;
  label: string;
} {
  if (score >= 75) {
    return { text: "text-accent-teal", bar: "#2dd4bf", label: "High" };
  }
  if (score >= 50) {
    return { text: "text-accent-cyan", bar: "#2dd4e6", label: "Moderate" };
  }
  return { text: "text-ink-secondary", bar: "#4f8dfd", label: "Low" };
}
