export const UI_V3_SPACING_SCALE = [4, 8, 12, 16, 24, 32] as const;

export const UI_V3_CLASS = {
  pageStack: "flex flex-col gap-6 pb-6",
  sectionStack: "flex flex-col gap-4",
  controlStack: "flex flex-col gap-3",
  pageTitle: "text-base text-foreground",
  pageSubtitle: "text-xs text-muted-foreground",
  radiusControl: "rounded-xl",
  radiusSurface: "rounded-2xl",
  radiusOverlay: "rounded-[20px]",
  ctaPrimary: "rounded-xl",
  ctaSecondary: "rounded-xl",
  segmentedRoot: "inline-flex items-center gap-1 rounded-xl border border-border/60 bg-muted/80 p-1",
  segmentedItem: "inline-flex items-center justify-center rounded-xl px-3 text-sm transition-colors",
  interactiveSize: "h-11 w-11",
} as const;

export const UI_V3_RULES = {
  maxSurfaceLevelsPerSection: 2,
  defaultElevation: "none",
  primaryCtasPerViewport: 1,
} as const;
