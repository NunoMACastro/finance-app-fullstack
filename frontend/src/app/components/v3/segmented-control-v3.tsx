import { UI_V3_CLASS } from "./layout-contracts";
import { cn } from "../ui/utils";

export interface SegmentedControlOption<T extends string | number> {
  value: T;
  label: string;
  disabled?: boolean;
}

export function SegmentedControlV3<T extends string | number>({
  value,
  onChange,
  options,
  size = "default",
  className,
  ariaLabel,
  dataTour,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedControlOption<T>>;
  size?: "default" | "compact";
  className?: string;
  ariaLabel?: string;
  dataTour?: string;
}) {
  const controlSizeClass = size === "default" ? "h-11 min-w-[4rem]" : "h-9 min-w-[3.5rem]";
  return (
    <div
      className={cn(UI_V3_CLASS.segmentedRoot, className)}
      role="group"
      aria-label={ariaLabel}
      data-ui-v3-segmented="true"
      data-tour={dataTour}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            className={cn(
              UI_V3_CLASS.segmentedItem,
              controlSizeClass,
              active ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            disabled={option.disabled}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
