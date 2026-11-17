/**
 * IconTextButton icon map
 *
 * Defines the allowed icon set for IconTextButton. Add new entries
 * here - the component and its stories pick them up automatically.
 */

import {
  IconArrowLeft,
  IconBook,
  IconCalendar,
  IconCheck,
  IconDownload,
  IconMessageReport,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconSettings,
  IconTrash,
  IconUser,
  IconUserPlus,
  IconX,
} from "@/components/icons/appIcons";
import type { ReactElement } from "react";

/** Allowed icon names - add new entries here to extend the component. */
const iconTextButtonIcons = {
  arrowLeft: <IconArrowLeft />,
  book: <IconBook />,
  calendar: <IconCalendar />,
  check: <IconCheck />,
  download: <IconDownload />,
  feedback: <IconMessageReport />,
  pencil: <IconPencil />,
  refresh: <IconRefresh />,
  search: <IconSearch />,
  settings: <IconSettings />,
  trash: <IconTrash />,
  user: <IconUser />,
  x: <IconX />,
  userPlus: <IconUserPlus />,
} as const satisfies Record<string, ReactElement>;

export default iconTextButtonIcons;
