import ErrorDisplay from "#src/components/ErrorDisplay/ErrorDisplay.tsx";
import useREST from "#src/hooks/useREST.ts";
import { Box, Button, LoadingOverlay, PasswordInput, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router";

interface CreateAccountForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  verifyPassword: string;
}

interface CreateAccountAPIRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

const CreateAccountPage = () => {
  const navigate = useNavigate();
  const {
    success: accountCreated,
    loading: accountCreating,
    error: accountCreationError,
    submitFn: createAccount
  } = useREST<CreateAccountAPIRequest, null>('POST', '/auth/register/');

  const form = useForm<CreateAccountForm>({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      verifyPassword: ''
    },
    validate: {
      firstName: (value) => (value.length < 2 ? 'First name must be at least 2 characters' : null),
      lastName: (value) => (value.length < 2 ? 'Last name must be at least 2 characters' : null),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'The email specified is not valid'),
      password: (value) => (value.length < 8 ? 'Password must be at least 8 characters' : null),
      verifyPassword: (value, values) => (value !== values.password ? 'Passwords do not match' : null)
    }
  });

  if (accountCreated) {
    return (
      <Box>
        <Stack gap="sm">
           <Text size="sm">
            A confirmation email has been sent to your email address. Please check your inbox and follow the instructions to complete your registration.
          </Text>
          <Button fullWidth variant="outline" onClick={() => navigate('/auth')}>
            Back to login
          </Button>
        </Stack>
      </Box>
    )
  }

  return (
    <Box>
      <form onSubmit={form.onSubmit(createAccount)}>
        <LoadingOverlay visible={accountCreating} />
        <ErrorDisplay title="Failed to create account" error={accountCreationError} />
        <Stack gap="md">
          <SimpleGrid cols={2}>
            <TextInput label="First Name" {...form.getInputProps('firstName')} key={form.key('firstName')} withAsterisk />
            <TextInput label="Last Name" {...form.getInputProps('lastName')} key={form.key('lastName')} withAsterisk />
          </SimpleGrid>
          <TextInput label="Email" {...form.getInputProps('email')} key={form.key('email')} withAsterisk />
          <PasswordInput label="Password" {...form.getInputProps('password')} key={form.key('password')} withAsterisk />
          <PasswordInput label="Verify Password" {...form.getInputProps('verifyPassword')} key={form.key('verifyPassword')} withAsterisk />

          <Button fullWidth mt="md" type="submit">
            Register
          </Button>

          <Button fullWidth variant="outline" onClick={() => navigate('/auth')}>
            Back to login
          </Button>
        </Stack>
      </form>
    </Box>
  )
}

export default CreateAccountPage;
