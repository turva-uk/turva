import type { IconName } from "@/components/icons/NavIcon";

/** One link in the side bar. */
export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

/** The side bar's links, in the order they are shown, each with its icon. */
export const NAVIGATION: readonly NavItem[] = [
  { to: "/safety-files", label: "Safety files", icon: "safety" },
  { to: "/profile", label: "Your profile", icon: "user" },
  { to: "/organisations", label: "Organisations", icon: "building-community" },
];

/** Whether `pathname` is `to`, or a page beneath it. */
export function isWithin(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
