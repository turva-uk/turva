import type { IconName } from "@/components/icons/NavIcon";

/** A link beneath one in the side bar, such as "Your profile" under "Settings". */
export interface NavChild {
  to: string;
  label: string;
}

/** One link in the side bar, with any links beneath it. */
export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  /** Each shown beneath this link while its own page is open */
  children?: readonly NavChild[];
}

/** The side bar's links, in the order they are shown, each with its icon. */
export const NAVIGATION: readonly NavItem[] = [
  { to: "/safety-files", label: "Safety files", icon: "safety" },
  {
    to: "/settings",
    label: "Settings",
    icon: "settings",
    children: [{ to: "/settings/profile", label: "Your profile" }],
  },
  { to: "/organisations", label: "Organisations", icon: "building-community" },
];

/** Whether `pathname` is `to`, or a page beneath it. */
export function isWithin(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}
