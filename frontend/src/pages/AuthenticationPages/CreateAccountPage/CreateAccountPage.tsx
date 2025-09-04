import { Box, Button, PasswordInput, Select, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useNavigate } from "react-router";

const CreateAccountPage = () => {
  const navigate = useNavigate();

  return (
    <Box>
      <Stack gap="sm">
        <Text>
          A confirmation email has been sent to your email address. Please check your inbox and follow the instructions to complete your registration.
        </Text>
        <Button fullWidth variant="outline" onClick={() => navigate('/app/auth')}>
          Back to login
        </Button>
      </Stack>
    </Box>
  )
  return (
    <Box>
      <Stack gap="sm">
        <SimpleGrid cols={2}>
          <TextInput label="First Name" required />
          <TextInput label="Last Name" required />
        </SimpleGrid>
        <TextInput label="Email" required />
        <PasswordInput label="Password" required />
        <PasswordInput label="Verify Password" required />
        <TextInput label="Organisation Name" required />
        <Select
          label="Job Role"
          required
          data={[
            { value: 'clinicalsafetyofficer', label: 'Clinical Safety Officer' },
            { value: 'other', label: 'Other' },
          ]}
        />

        <Button fullWidth>
          Register
        </Button>

        <Button fullWidth variant="outline" onClick={() => navigate('/app/auth')}>
          Back to login
        </Button>
      </Stack>
    </Box>
  )
}

export default CreateAccountPage;
