import { Container, Title, rem, Image, Stack, Center, Box, Text, Button } from '@mantine/core';
import TurvaLogo from '../../resources/images/turva-solid-yellow-purple-master-logo.svg';

const LandingPage = () => {
  return (
    <Box bg="#716c9e">
      <Container style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: "white"
      }}>
        <Stack>
          <Center>
            <Image
              src={TurvaLogo}
              alt="Turva Logo"
              style={{ width: '200px', marginBottom: '1rem' }}
            />
          </Center>

          <div style={{ width: '100%', textAlign: 'center' }}>
            <Title order={1} style={{
              fontWeight: 850,
              fontSize: rem(100),
              lineHeight: 1,
              marginBottom: '1rem',
            }}>Turva</Title>
            <Title order={2} style={{
              fontWeight: 700,
              fontSize: rem(50),
              lineHeight: 1,
              marginBottom: '1rem',
            }}>A 21st Century Clinical Safety Compliance Platform</Title>

            <Text style={{
              fontFamily: 'Greycliff CF, var(--mantine-font-family)',
              fontSize: rem(25),
              fontWeight: 700,
              marginBottom: '2rem'
            }}>
              Coming soon!
            </Text>

            <Button
              component="a"
              href="https://github.com/digital-clinical-safety-alliance/turva"
              target="_blank"
              size="lg"
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#dec55e',
                color: 'black',
                fontFamily: 'Greycliff CF, var(--mantine-font-family)',
                padding: `${rem(10)} ${rem(20)}`,
              }}
            >
              Visit our GitHub
            </Button>
          </div>

        </Stack>
      </Container>
    </Box>
  );
};

export default LandingPage;
