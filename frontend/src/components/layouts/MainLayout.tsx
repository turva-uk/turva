/**
 * MainLayout Component
 *
 * The frame around every page. Somebody signed in sees the ribbon, the
 * side bar on the left and the page beside it; on a narrow screen the side
 * bar folds away behind the ribbon's burger button and opens as a drawer.
 * Somebody signed in also sees the inbox envelope on the right of the
 * ribbon, and a footer saying who they are. Somebody signed out, on
 * sign-in, registration or password reset, sees the ribbon and the page
 * alone.
 *
 * The page goes in `main`, with the id `main-content`, which the app's
 * skip link targets.
 *
 * @example
 * ```tsx
 * <MainLayout signedIn onSignOut={signOut} signingOut={false}>
 *   <Routes>...</Routes>
 * </MainLayout>
 * ```
 */

import { AppShell, Container } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";

import NavigationDrawer from "@/components/drawers/NavigationDrawer";
import Footer from "@/components/footer/Footer";
import InboxButton from "@/components/inbox/InboxButton";
import SideNav from "@/components/navigation/SideNav";
import TopRibbon from "@/components/ribbon/TopRibbon";
import { LAYOUT_PADDING_X, LAYOUT_SIDEBAR_WIDTH } from "./layoutConstants";
import classes from "./MainLayout.module.css";
import { useNavCollapsed } from "./useNavCollapsed";

/** The ribbon's height in pixels, yellow rule included. */
const RIBBON_HEIGHT = 70;

/** The footer's height in pixels. */
const FOOTER_HEIGHT = 48;

export interface MainLayoutProps {
  /** Whether somebody is signed in. The side bar shows only then. */
  signedIn: boolean;
  /** Called when "Sign out" is pressed */
  onSignOut: () => void;
  /** Signing out is under way */
  signingOut?: boolean;
  /** The signed-in person's name, for the footer */
  signedInAs?: string;
  /** The page */
  children: ReactNode;
}

export default function MainLayout({
  signedIn,
  onSignOut,
  signingOut = false,
  signedInAs,
  children,
}: MainLayoutProps) {
  const navigate = useNavigate();
  const collapsed = useNavCollapsed();
  const [drawerOpen, drawer] = useDisclosure(false);
  const showSideBar = signedIn && !collapsed;
  const showBurger = signedIn && collapsed;

  return (
    <AppShell
      header={{ height: RIBBON_HEIGHT }}
      footer={signedIn && signedInAs ? { height: FOOTER_HEIGHT } : undefined}
      navbar={
        signedIn
          ? {
              width: LAYOUT_SIDEBAR_WIDTH,
              breakpoint: "md",
              collapsed: { mobile: true, desktop: !showSideBar },
            }
          : undefined
      }
      padding={LAYOUT_PADDING_X}
      classNames={{ root: classes.shell, footer: classes.footer, navbar: classes.navbar }}
    >
      <AppShell.Header>
        <TopRibbon
          showBurger={showBurger}
          navOpen={drawerOpen}
          onBurgerClick={drawer.toggle}
          end={
            signedIn ? (
              <InboxButton label="Inbox" onClick={() => void navigate("/inbox")} />
            ) : undefined
          }
        />
      </AppShell.Header>

      {showSideBar && (
        <AppShell.Navbar>
          <SideNav onSignOut={onSignOut} signingOut={signingOut} />
        </AppShell.Navbar>
      )}

      {showBurger && (
        <NavigationDrawer opened={drawerOpen} onClose={drawer.close}>
          <SideNav onSignOut={onSignOut} signingOut={signingOut} onNavigate={drawer.close} />
        </NavigationDrawer>
      )}

      <AppShell.Main id="main-content" tabIndex={-1}>
        <Container fluid maw={1280} px={0}>
          {children}
        </Container>
      </AppShell.Main>

      {signedIn && signedInAs && (
        // A plain slot: `Footer` is the page's one footer landmark.
        <AppShell.Footer component="div">
          <Footer text={`Signed in as ${signedInAs}`} />
        </AppShell.Footer>
      )}
    </AppShell>
  );
}
