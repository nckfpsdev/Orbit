"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  SearchX,
  Globe2,
  Link2,
  CircleHelp,
  Camera as Instagram,
  CircleSlash2,
  Star,
} from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { WEBSITE_LABELS } from "@/lib/domain/constants";
import { scoreLabel } from "@/lib/domain/scoring";
import type { WebsiteStatus } from "@/lib/domain/types";
export function Pick({
  value,
  onChange,
  items,
  label,
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  items: (string | { value: string; label: string })[];
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger aria-label={label} className={`orbit-select ${className}`}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => {
          const v = typeof item === "string" ? item : item.value;
          return (
            <SelectItem key={v} value={v}>
              {typeof item === "string" ? item : item.label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
export function Action({
  busy = false,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { busy?: boolean }) {
  return (
    <Button {...props} disabled={busy || props.disabled} aria-busy={busy}>
      {busy && <Loader2 size={16} className="spin" />}
      {children}
    </Button>
  );
}
export function StatusBadge({
  status,
  compact = false,
}: {
  status: WebsiteStatus;
  compact?: boolean;
}) {
  const Icon =
    status === "own_website"
      ? Globe2
      : status === "social_only"
        ? Instagram
        : status === "aggregator" || status === "directory"
          ? Link2
          : status === "inconclusive"
            ? CircleHelp
            : CircleSlash2;
  return (
    <span className={`status-badge status-${status}`}>
      <Icon size={13} />
      {compact
        ? status === "own_website"
          ? "Site próprio"
          : status === "inconclusive"
            ? "Inconclusivo"
            : "Sem site próprio"
        : WEBSITE_LABELS[status]}
    </span>
  );
}
export function ScoreBadge({
  score,
  large = false,
}: {
  score: number;
  large?: boolean;
}) {
  return (
    <span
      className={`score-badge ${large ? "score-large" : ""} score-${score >= 80 ? "high" : score >= 65 ? "good" : score >= 40 ? "medium" : "low"}`}
      title={`${scoreLabel(score)} oportunidade`}
    >
      <Star size={large ? 18 : 12} fill="currentColor" />
      {score}
      <small>/100</small>
    </span>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Empty className="empty-state">
      <div className="empty-symbol">
        <SearchX size={28} />
      </div>
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
