import { Title, Paper, Group, Container, Image, rem, ActionIcon } from "@mantine/core";
import TurvaColouredLogo from '../../resources/images/turva-solid-yellow-purple-master-logo.svg'
import { Outlet } from "react-router";
import { useContext } from "react";
import { ConfigurationContext } from "#src/app/contexts/ConfigurationContext.tsx";
import { IconMoon, IconSun } from "@tabler/icons-react";

const AuthenticationLayout = () => {
  // set body background color to theme color
  const { configuration, updateConfigurationEntry } = useContext(ConfigurationContext);

  return (
    <>
      <Container size={500} my={40}>
        <Group justify="center">
          <Image
            src={TurvaColouredLogo}
            alt="Turva Logo"
            style={{ width: '50px' }}
          />

          <Title ta="center" order={1} size={rem(26)}>
            Welcome to Turva!
          </Title>
        </Group>

        <Paper withBorder shadow="sm" p={22} mt={30}>
          <Outlet />
        </Paper>
      </Container>

      <ActionIcon
        variant="outline"
        color="turva"
        style={{ position: 'fixed', top: 20, right: 20 }}
        onClick={() => {
          updateConfigurationEntry('darkMode', !configuration?.darkMode);
        }}
        size={30}
      >
        {
          configuration?.darkMode ? <IconSun size="1.1rem" /> : <IconMoon size="1.1rem" />
        }
      </ActionIcon>
    </>
  );
}

export default AuthenticationLayout;
