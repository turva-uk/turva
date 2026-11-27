import {
  SimpleGrid,
  Stack,
  useComputedColorScheme,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

import ActionCard from "../components/action-card";
import SolidSwitch from "../components/form/SolidSwitch";
import { IconMoon, IconUser } from "../components/icons/appIcons";
import { PageHeader } from "../components/typography";

/**
 * Settings: a card for each setting, two to a row on a wide screen. "Your
 * profile" opens its own page, and "Dark mode" switches the colour scheme
 * at once, remembered by this browser.
 */
export function SettingsPage() {
  const theme = useMantineTheme();
  const twoColumns = useMediaQuery(`(min-width: ${theme.breakpoints.md})`);
  const { setColorScheme } = useMantineColorScheme();
  const isDark = useComputedColorScheme("light") === "dark";

  return (
    <Stack gap="lg">
      <PageHeader title="Settings" />

      <SimpleGrid cols={twoColumns ? 2 : 1}>
        <ActionCard
          icon={<IconUser />}
          title="Your profile"
          subtitle="Update your name, professional registration and Clinical Safety Officer declaration."
          buttonLabel="Edit your profile"
          buttonUrl="/settings/profile"
        />

        <ActionCard
          icon={<IconMoon />}
          title="Dark mode"
          subtitle="Switch between light and dark colour schemes."
          action={
            <SolidSwitch
              // The card's title is not tied to the switch, so it is named
              // here; without it, it is announced as "No".
              aria-label="Dark mode"
              checked={isDark}
              onChange={() => setColorScheme(isDark ? "light" : "dark")}
            />
          }
        />
      </SimpleGrid>
    </Stack>
  );
}
