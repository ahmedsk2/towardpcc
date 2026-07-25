import type { HTMLAttributes } from "react";
import { cn } from "./cn";

/** Layout-shaped loading placeholder; animation stops under reduced motion. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-surface-sunken motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
