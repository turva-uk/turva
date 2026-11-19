import type { MouseEvent } from "react";

const CONTROLS =
  "a, button, input, select, textarea, label, summary, [tabindex], [contenteditable]:not([contenteditable=false]), [role=button], [role=link], [role=checkbox], [role=switch], [role=menuitem], [role=combobox], [role=slider]";

/** Nested controls, including React portals, keep their own action. */
export function shouldActivateRow(event: MouseEvent<HTMLElement>): boolean {
  return event.target instanceof Element && event.target.closest(CONTROLS) === null;
}
