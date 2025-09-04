import { Title, Paper, Group, Container, Image, rem } from "@mantine/core";
import TurvaColouredLogo from '../../resources/images/turva-solid-yellow-purple-master-logo.svg'
import { Outlet } from "react-router";

const AuthenticationLayout = () => {
  return (
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
  );
}

export default AuthenticationLayout;
