import { useContext, type ReactNode } from "react";
import { AppShell, Group, Menu, NavLink, ScrollArea, rem, Title, Burger, useMantineColorScheme, Box, Image } from "@mantine/core";
import { IconBuilding, IconDashboard, IconDoorExit, IconMoon, IconSettings, IconSun, IconTemplate } from "@tabler/icons-react";
import classes from "./DashboardLayout.module.css";
import { Outlet, useNavigate } from "react-router";
import UserButton from "./components/UserButton/UserButton";
import TurvaTransparentLogo from '../../resources/images/turva-transparent.svg'
import { ConfigurationContext } from "../../app/contexts/ConfigurationContext";

interface DashboardNavItem {
  label: string;
  href?: string;
  icon?: ReactNode;
  isDirectLink?: boolean;
  innerNavs?: DashboardNavItem[];
  default?: boolean;
  hide?: boolean;
}

const navButtons: DashboardNavItem[] = [
  {
    label: "Projects",
    icon: <IconDashboard size="1rem" stroke={1.5} />,
    href: "/",
  },
  {
    label: "Templates",
    icon: <IconTemplate size="1rem" stroke={1.5} />,
    href: "/templates",
  },
  {
    label: "Organisations",
    icon: <IconBuilding size="1rem" stroke={1.5} />,
    href: '/organisations'
  },
]

const DashboardLayout = () => {
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const { configuration, updateConfigurationEntry } = useContext(ConfigurationContext);

  return (
    <>
      <AppShell
        header={{
          height: 60,
          collapsed: !configuration?.collapseNav,
          offset: false,
        }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: configuration?.collapseNav, desktop: configuration?.collapseNav },
        }}
        withBorder={false}
        padding="md"
      >
        <AppShell.Header className={classes.topHeader}>
          <Group justify="left" gap="sm">
            <Burger
              opened={!configuration?.collapseNav}
              onClick={() => updateConfigurationEntry('collapseNav', !configuration?.collapseNav)}
              className={classes.burger}
              size="sm"
              // color={colorScheme === 'dark' ? 'white' : 'black'}
              color="white"
            />
            <Image
              src={TurvaTransparentLogo}
              alt="Turva Logo"
              height={rem(30)}
              width={rem(30)}
              style={{ width: rem(30) }}
            />
            <Title order={4} ta="center" c="white">
              Turva
            </Title>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar>
          <nav className={classes.navbar}>
            <div className={classes.header}>
              <Group justify="space-between">
                <Group justify="left" gap="sm">
                  <Image
                    src={TurvaTransparentLogo}
                    alt="Turva Logo"
                    height={rem(30)}
                    width={rem(30)}
                    style={{ width: rem(30) }}
                  />
                  <Title order={5} ta="center" className={classes.title}>
                    Turva
                  </Title>
                </Group>
                <Burger
                  opened={!configuration?.collapseNav}
                  onClick={() => updateConfigurationEntry('collapseNav', !configuration?.collapseNav)}
                  size="sm"
                  color="white"
                  className={classes.burger}
                />
              </Group>
            </div>

            <ScrollArea className={classes.links}>
              {navButtons?.filter(b => !b.hide).map((button, index) => (
                <NavLink
                  key={index}
                  className={classes.navLink}
                  label={button.label}
                  leftSection={button.icon}
                  active={
                    !!(
                      button.href && (
                        window.location.pathname === button.href || window.location.pathname.startsWith(`/app${button.href}`)
                      ) || (
                        button.href === '/' && (window.location.pathname === '/app' || window.location.pathname === '/app/')
                      )
                    )
                  }
                  onClick={() => {
                    if (button.href) {
                      navigate(`/app${button.href}`, { replace: false })
                    }
                  }}
                  variant="filled"
                >
                  {button.innerNavs && !button.hide && button.innerNavs.map((innerNav, innerIndex) => (
                    <NavLink
                      key={innerIndex}
                      className={classes.navLink}
                      label={innerNav.label}
                      onClick={() => navigate(innerNav.href!, { replace: false })}
                      leftSection={innerNav.icon}
                    />
                  ))}
                </NavLink>
              ))}
            </ScrollArea>

            <Box mt="md" className={classes.bottomButtons}>
              {/* User menu */}
              <Menu position="right-end">
                <Menu.Target>
                  <UserButton />
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>
                    Settings
                  </Menu.Label>
                  <Menu.Item
                    onClick={() => {
                      const newColorScheme = colorScheme === 'dark' ? 'light' : 'dark';
                      setColorScheme(newColorScheme);
                      updateConfigurationEntry('darkMode', newColorScheme === 'dark');
                    }}
                    leftSection={
                      colorScheme === 'dark' ? (
                        <IconSun style={{ width: rem(14), height: rem(14) }} />
                      ) : (
                        <IconMoon style={{ width: rem(14), height: rem(14) }} />
                      )
                    }
                  >
                    Toggle theme
                  </Menu.Item>
                  <Menu.Item
                    leftSection={
                      <IconSettings style={{ width: rem(14), height: rem(14) }} />
                    }
                    onClick={() => navigate('/settings', { replace: true })}
                  >
                    Account settings
                  </Menu.Item>
                  <Menu.Divider />
                  <Menu.Item
                    color="red"
                    onClick={() => navigate('/logout', { replace: true })}
                    leftSection={<IconDoorExit style={{ width: rem(14), height: rem(14) }} />}
                  >
                    Logout
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>

          </nav>
        </AppShell.Navbar>
        <AppShell.Main
          style={{ marginTop: (configuration?.collapseNav ? "60px" : "0px") }}
        >
          <Outlet />
        </AppShell.Main>
      </AppShell>
    </>
  );
}

export default DashboardLayout;