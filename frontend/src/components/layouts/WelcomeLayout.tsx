/**
 * WelcomeLayout Component
 *
 * The layout of every signed-out page: sign-in, registration, email
 * confirmation and password reset. A welcome panel with Turva's logo and a
 * few lines on what Turva does takes 60% of the width on the left, and the
 * page's form takes 40% on the right. The panel has no background of its
 * own, so it sits quietly on the page beside the form. It stays still,
 * its text centred in the window, while a long form such as registration
 * scrolls past it. The form keeps the same space from the right edge as
 * the panel's text keeps from the left.
 *
 * Below the theme's `md` breakpoint the panel is hidden and the form fills
 * the width, so a phone shows only what the person came to do. Anything that
 * must show at every width, such as the intended-use line under the sign-in
 * form, belongs in the form's column, never in the panel.
 *
 * The form comes first in the page's order, so a screen reader or a keyboard
 * reaches it before the panel; the panel is placed on the left only visually.
 *
 * @example
 * ```tsx
 * <WelcomeLayout>
 *   <PageHeader title="Sign in" />
 *   <Form>...</Form>
 * </WelcomeLayout>
 * ```
 */

import { Box, Grid, Group, Stack } from "@mantine/core";
import type { ReactNode } from "react";

import { TurvaLogo } from "@/components/logo";
import { BodyText, Heading } from "@/components/typography";
import classes from "./WelcomeLayout.module.css";
import { WELCOME_HEADING, WELCOME_LINES } from "./welcomeText";

export interface WelcomeLayoutProps {
  /** The page itself: its header, form and links */
  children: ReactNode;
}

export default function WelcomeLayout({ children }: WelcomeLayoutProps) {
  return (
    <Grid columns={5} gap="xl" mt="md">
      <Grid.Col span={{ base: 5, md: 2 }} order={{ base: 1, md: 2 }}>
        <Box maw={560} mx="auto" className={classes.form} data-testid="welcome-form">
          {children}
        </Box>
      </Grid.Col>

      <Grid.Col
        span={3}
        order={{ base: 2, md: 1 }}
        visibleFrom="md"
        className={classes.column}
        data-testid="welcome-panel"
      >
        <Stack gap="lg" p="xl" className={classes.panel}>
          <Group gap="lg" wrap="nowrap">
            <TurvaLogo size={88} />
            <Heading>{WELCOME_HEADING}</Heading>
          </Group>
          {WELCOME_LINES.map((line) => (
            <BodyText key={line}>{line}</BodyText>
          ))}
        </Stack>
      </Grid.Col>
    </Grid>
  );
}
