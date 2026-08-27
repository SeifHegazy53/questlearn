"use client";

import { cloneElement, isValidElement, ReactElement, ReactNode } from "react";
import { DEMO_MODE, DEMO_MODE_MESSAGE } from "@/lib/demo-mode";

/**
 * Module 10.4 / ADR 0004: wraps a single mutating control (a Button
 * that creates/edits/archives/assigns/etc.) so the public demo build
 * disables it WITH an explanation, rather than either leaving it live
 * (it would just 403 from DemoModeGuard on click) or silently
 * removing it (which reads as a missing feature, not a deliberate
 * demo boundary).
 *
 * Pass-through with zero overhead when NEXT_PUBLIC_DEMO_MODE isn't
 * set -- every existing page that doesn't wrap its controls in this
 * component is completely unaffected, and wrapping one in a non-demo
 * build renders its child exactly as if this component didn't exist.
 */
export function DemoModeAction({ children }: { children: ReactNode }) {
  if (!DEMO_MODE) return <>{children}</>;
  if (!isValidElement(children)) return <>{children}</>;

  const element = children as ReactElement<{ disabled?: boolean; onClick?: unknown }>;

  return (
    <span title={DEMO_MODE_MESSAGE} data-testid="demo-mode-disabled-action">
      {cloneElement(element, { disabled: true, onClick: undefined })}
    </span>
  );
}
