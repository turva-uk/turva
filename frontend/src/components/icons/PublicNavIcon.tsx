/**
 * Public Navigation Icon Component
 *
 * Navy background with amber icon, matching the public pages colour scheme.
 * Mirrors NavIcon but uses the public site palette.
 */

import { ThemeIcon } from "@mantine/core";
import {
  IconHome2,
  IconChalkboardTeacher,
  IconBook,
  IconCertificate,
  IconChartBar,
  IconCurrencyPound,
  IconDatabase,
  IconLogin,
  IconMail,
  IconPresentation,
} from "@/components/icons/appIcons";
import { PUBLIC_ICON_STROKE } from "@/components/icons/publicIconStroke";

/** Icon names available in public navigation */
export type PublicNavIconName =
  | "home"
  | "teaching"
  | "learning"
  | "assessments"
  | "educators"
  | "book"
  | "pricing"
  | "database"
  | "login"
  | "mail";

/** Available icon sizes */
type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

type PublicNavIconProps = {
  /** Icon type to display */
  name: PublicNavIconName;
  /** Icon size preset (default: "lg") */
  size?: IconSize;
};

const iconMap: Record<PublicNavIconName, typeof IconHome2> = {
  home: IconHome2,
  teaching: IconChalkboardTeacher,
  learning: IconPresentation,
  assessments: IconCertificate,
  educators: IconChartBar,
  book: IconBook,
  pricing: IconCurrencyPound,
  database: IconDatabase,
  login: IconLogin,
  mail: IconMail,
};

const iconSizeMap: Record<IconSize, number> = {
  xs: 10,
  sm: 13,
  md: 16,
  lg: 22,
  xl: 29,
};

export default function PublicNavIcon({ name, size = "lg" }: PublicNavIconProps) {
  const Icon = iconMap[name];
  const iconPixelSize = iconSizeMap[size];

  return (
    <ThemeIcon variant="transparent" radius="xl" size={size}>
      <Icon
        size={iconPixelSize}
        color="var(--mantine-color-secondary-4)"
        stroke={PUBLIC_ICON_STROKE}
      />
    </ThemeIcon>
  );
}
