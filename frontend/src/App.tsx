import { AppShell, Anchor, Button, Group, Loader, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router";

import { useSession } from "./auth/useSession";
import { ACCENT, BRAND } from "./theme";
import { LoginPage } from "./pages/LoginPage";
import { SafetyFileDetailPage } from "./pages/SafetyFileDetailPage";
import { SafetyFilesPage } from "./pages/SafetyFilesPage";

/**
 * Gate a route behind a session.
 *
 * `loading` is handled separately from "no user" on purpose: treating them the
 * same would redirect a signed-in user to the login screen for the fraction of
 * a second before the session call returns.
 */
function RequireSession({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <Loader aria-label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return <>{children}</>;
}

function Header() {
  const { user, signOut } = useSession();

  return (
    <Group
      h="100%"
      px="md"
      justify="space-between"
      // The brand band, matching the Django templates exactly while both
      // interfaces are live: the logo purple carrying white text, with the
      // logo yellow as a rule beneath it. The yellow is decorative - it
      // echoes the purple-on-yellow of the mark and carries no information,
      // so nothing is lost if a user's own styles drop it.
      bg={BRAND}
      c="white"
      style={{ borderBottom: `3px solid ${ACCENT}` }}
    >
      <Anchor component={Link} to="/" fw={700} underline="never" c="white">
        Turva
      </Anchor>
      {user && (
        <Group gap="md">
          <Text size="sm" c="white">
            {user.full_name || user.email}
          </Text>
          <Button variant="white" size="compact-sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </Group>
      )}
    </Group>
  );
}

export function App() {
  const { user, loading } = useSession();

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Header />
      </AppShell.Header>

      <AppShell.Main>
        <Routes>
          <Route
            path="/login"
            element={
              loading ? (
                <Loader aria-label="Checking your session" />
              ) : user ? (
                <Navigate to="/safety-files" replace />
              ) : (
                <LoginPage />
              )
            }
          />
          <Route
            path="/safety-files"
            element={
              <RequireSession>
                <SafetyFilesPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug"
            element={
              <RequireSession>
                <SafetyFileDetailPage />
              </RequireSession>
            }
          />
          <Route path="/" element={<Navigate to="/safety-files" replace />} />
          <Route path="*" element={<Text>That page does not exist.</Text>} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
