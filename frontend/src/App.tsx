import { Alert, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";

import { useSession } from "./auth/useSession";
import { MainLayout } from "./components/layouts";
import { PageSpinner } from "./components/loading-spinner";
import { LoginPage } from "./pages/LoginPage";
import { SafetyFileDetailPage } from "./pages/SafetyFileDetailPage";
import { SafetyDocumentPage } from "./pages/SafetyDocumentPage";
import { SafetyFilesPage } from "./pages/SafetyFilesPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SafetyFileCreatePage } from "./pages/SafetyFileCreatePage";
import { HazardDetailPage } from "./pages/HazardDetailPage";
import { InboxPage } from "./pages/InboxPage";
import { HazardFormPage } from "./pages/HazardFormPage";
import { MitigationFormPage } from "./pages/MitigationFormPage";
import { MitigationDetailPage } from "./pages/MitigationDetailPage";
import { OrganisationsPage } from "./pages/OrganisationsPage";
import { OrganisationPage } from "./pages/OrganisationPage";
import { InvitationPage } from "./pages/InvitationPage";
import { FileTeamPage } from "./pages/FileTeamPage";
import { RegistrationPage } from "./pages/RegistrationPage";
import { VerificationConfirmPage, VerificationNoticePage } from "./pages/VerificationPage";
import { PasswordResetConfirmPage, PasswordResetRequestPage } from "./pages/PasswordResetPage";
import "./app.css";

/**
 * Gate a route behind a session.
 *
 * `loading` is handled separately from "no user" on purpose: treating them the
 * same would redirect a signed-in user to the login screen for the fraction of
 * a second before the session call returns.
 */
function RequireSession({
  children,
  verified = false,
}: {
  children: ReactNode;
  verified?: boolean;
}) {
  const { user, loading } = useSession();
  const location = useLocation();

  if (loading) return <PageSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (verified && !user.is_verified) return <Navigate to="/verify-email" replace />;
  return <>{children}</>;
}

export function App() {
  const { user, loading, signOutError, signOut, signingOut } = useSession();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <MainLayout
        signedIn={Boolean(user)}
        onSignOut={() => void signOut()}
        signingOut={signingOut}
        signedInAs={user?.full_name}
      >
        {signOutError && (
          <Alert color="red" mb="md" role="alert" title="You have not been signed out">
            {signOutError}
          </Alert>
        )}
        <Routes>
          <Route
            path="/organisations"
            element={
              <RequireSession verified>
                <OrganisationsPage />
              </RequireSession>
            }
          />
          <Route
            path="/organisations/invitations/:invitationId"
            element={
              loading ? <PageSpinner label="Checking your session" /> : <InvitationPage />
            }
          />
          <Route
            path="/organisations/:organisationId"
            element={
              <RequireSession verified>
                <OrganisationPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/team"
            element={
              <RequireSession verified>
                <FileTeamPage />
              </RequireSession>
            }
          />
          <Route
            path="/register"
            element={
              loading ? <PageSpinner label="Checking your session" /> : <RegistrationPage />
            }
          />
          <Route
            path="/verify-email"
            element={
              <RequireSession>
                <VerificationNoticePage />
              </RequireSession>
            }
          />
          <Route
            path="/accounts/verify/:userId/:token"
            element={
              loading ? (
                <PageSpinner label="Checking your session" />
              ) : (
                <VerificationConfirmPage />
              )
            }
          />
          <Route
            path="/password-reset"
            element={
              loading ? (
                <PageSpinner label="Checking your session" />
              ) : (
                <PasswordResetRequestPage />
              )
            }
          />
          <Route
            path="/accounts/password-reset/:uid/:token"
            element={
              loading ? (
                <PageSpinner label="Checking your session" />
              ) : (
                <PasswordResetConfirmPage />
              )
            }
          />
          <Route
            path="/login"
            element={
              loading ? (
                <PageSpinner label="Checking your session" />
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
              <RequireSession verified>
                <SafetyFilesPage />
              </RequireSession>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireSession>
                <ProfilePage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/new"
            element={
              <RequireSession verified>
                <SafetyFileCreatePage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/mitigations/new"
            element={
              <RequireSession verified>
                <MitigationFormPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/mitigations/:mitigationId/edit"
            element={
              <RequireSession verified>
                <MitigationFormPage editing />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/mitigations/:mitigationId"
            element={
              <RequireSession verified>
                <MitigationDetailPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/hazards/new"
            element={
              <RequireSession verified>
                <HazardFormPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/hazards/:hazardId/edit"
            element={
              <RequireSession verified>
                <HazardFormPage editing />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/hazards/:hazardId"
            element={
              <RequireSession verified>
                <HazardDetailPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug/documents/:documentKey"
            element={
              <RequireSession verified>
                <SafetyDocumentPage />
              </RequireSession>
            }
          />
          <Route
            path="/safety-files/:slug"
            element={
              <RequireSession verified>
                <SafetyFileDetailPage />
              </RequireSession>
            }
          />
          <Route
            path="/inbox"
            element={
              <RequireSession>
                <InboxPage />
              </RequireSession>
            }
          />
          <Route path="/" element={<Navigate to="/safety-files" replace />} />
          <Route path="*" element={<Text>That page does not exist.</Text>} />
        </Routes>
      </MainLayout>
    </>
  );
}
