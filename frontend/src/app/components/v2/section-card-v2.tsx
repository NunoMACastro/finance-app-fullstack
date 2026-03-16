import type React from "react";
import { cn } from "../ui/utils";
import { UI_V3_CLASS } from "../v3/layout-contracts";

export type SectionCardV2Tone = "hero" | "section" | "control";

const toneClassMap: Record<SectionCardV2Tone, string> = {
  hero: `${UI_V3_CLASS.radiusSurface} border border-border/70 bg-card`,
  section: `${UI_V3_CLASS.radiusSurface} border border-border/70 bg-card`,
  control: `${UI_V3_CLASS.radiusControl} border border-border/70 bg-surface-soft`,
};

interface SectionCardV2Props {
  tone?: SectionCardV2Tone;
  className?: string;
  children: React.ReactNode;
}

export function SectionCardV2({ tone = "section", className, children }: SectionCardV2Props) {
  return <section className={cn(toneClassMap[tone], className)}>{children}</section>;
}
