import type React from "react";
import { cn } from "../ui/utils";

export type SectionCardV2Tone = "hero" | "section" | "control";

const toneClassMap: Record<SectionCardV2Tone, string> = {
  hero: "rounded-[28px] border border-border/40 bg-card/95 shadow-overlay",
  section: "rounded-[24px] border border-border/60 bg-card/94 shadow-card",
  control: "rounded-[18px] border border-border/70 bg-surface-soft/85",
};

interface SectionCardV2Props {
  tone?: SectionCardV2Tone;
  className?: string;
  children: React.ReactNode;
}

export function SectionCardV2({ tone = "section", className, children }: SectionCardV2Props) {
  return <section className={cn(toneClassMap[tone], className)}>{children}</section>;
}
