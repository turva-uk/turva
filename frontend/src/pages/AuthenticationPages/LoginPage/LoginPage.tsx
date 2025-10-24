import { Anchor, Box, Button, LoadingOverlay, PasswordInput, Text, TextInput } from "@mantine/core";
import { useNavigate } from "react-router";
import useREST from "../../../hooks/useREST";
import { Form, useForm } from "@mantine/form";
import { useContext, useEffect } from "react";
import { UserAuthContext } from "../../../app/contexts/UserAuthContext";
import ErrorDisplay from "../../../components/ErrorDisplay/ErrorDisplay";

interface LoginForm {
  emailAddress: string;
  password: string;
}

interface LoginResponse {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  isVerified: boolean;
  isCSO: boolean;
}

const LoginPage = () => {
  const navigate = useNavigate();
  const { data, error, loading, submitFn } = useREST<LoginForm, LoginResponse>('POST', '/auth/login/');
  const { updateUser } = useContext(UserAuthContext);

  const form = useForm<LoginForm>({
    initialValues: {
      emailAddress: '',
      password: ''
    },
    validate: {
      emailAddress: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email address'),
      password: (value) => (value.length == 0 ? 'Password is required' : null)
    }
  });

  useEffect(() => {
    if (data) {
      // Handle successful login, e.g., store user data, redirect, etc.
      updateUser({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.emailAddress,
        isVerified: data.isVerified,
        isCSO: data.isCSO
      });

      navigate('/'); // Redirect to dashboard
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return (
    <Box>
      <LoadingOverlay visible={loading} />
      <ErrorDisplay title="An error occured logging you in" error={error} />
      <Form form={form} onSubmit={submitFn}>
        <TextInput label="Email" {...form.getInputProps('emailAddress')} />
        <PasswordInput label="Password" mt="md" {...form.getInputProps('password')} />
        
        {/* <Group justify="end" mt="lg">
          <Anchor size="sm" onClick={() => navigate('/auth/forgot')}>
            Forgot password?
          </Anchor>
        </Group> */}

        <Button fullWidth mt="xl" type="submit">
          Sign in
        </Button>

        <Text ta="center" mt="md" size="sm" c="dimmed">
          Don't have an account?{' '}
          <Anchor size="sm" onClick={() => navigate('/auth/register')}>
            Create one here
          </Anchor>
        </Text>
      </Form>
    </Box>
  )
}

export default LoginPage;
