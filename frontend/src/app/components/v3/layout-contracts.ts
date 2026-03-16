export const UI_V3_SPACING_SCALE = [4, 8, 12, 16, 24, 32] as const;

export const UI_V3_CLASS = {
  pageStack: "flex flex-col gap-6 pb-6",
  sectionStack: "flex flex-col gap-4",
  controlStack: "flex flex-col gap-3",
  radiusControl: "rounded-xl",
  radiusSurface: "rounded-2xl",
  radiusOverlay: "rounded-[20px]",
  interactiveSize: "h-11 w-11",
} as const;

export const UI_V3_RULES = {
  maxSurfaceLevelsPerSection: 2,
  defaultElevation: "none",
  primaryCtasPerViewport: 1,
} as const;
