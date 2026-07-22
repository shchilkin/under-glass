import type { Visualization } from "@under-glass/core";
import type { ReactNode } from "react";

export interface ViewerProps {
  readonly className?: string;
  readonly fallback?: ReactNode;
  readonly visualization: Visualization;
}
