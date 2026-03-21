import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../ui/utils";

export function PageSectionFadeInV3({
  asChild = false,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
  children: ReactNode;
}) {
  const Comp = asChild ? Slot : "div";

  return (
    <Comp
      className={cn("page-section-fade-in-v3", className)}
      data-ui-v3-animate="page-fade"
      {...props}
    >
      {children}
    </Comp>
  );
}
