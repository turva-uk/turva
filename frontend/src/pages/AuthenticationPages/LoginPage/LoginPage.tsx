import { Anchor, Box, Button, Group, LoadingOverlay, PasswordInput, TextInput } from "@mantine/core";
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
    }
  });

  useEffect(() => {
    if (data) {
      // Handle successful login, e.g., store user data, redirect, etc.
      updateUser({
        id: data.id,
        firstName: data.firstName,
        lastName: data.lastName,
        emailAddress: data.emailAddress
      });

      console.log('Login successful:', data);
      navigate('/app/'); // Redirect to dashboard or another page
    }
  }, [data]);

  return (
    <Box>
      <LoadingOverlay visible={loading} />
      <ErrorDisplay title="An error occured logging you in" error={error} />
      <Form form={form} onSubmit={submitFn}>
        <TextInput label="Email" required {...form.getInputProps('emailAddress')} />
        <PasswordInput label="Password" required mt="md" {...form.getInputProps('password')} />
        <Group justify="end" mt="lg">
          <Anchor size="sm" onClick={() => navigate('/app/auth/forgot')}>
            Forgot password?
          </Anchor>
        </Group>

        <Button fullWidth mt="lg" type="submit">
          Sign in
        </Button>

        <Button fullWidth variant="outline" mt="sm" onClick={() => navigate('/app/auth/register')}>
          Create an account
        </Button>
      </Form>
    </Box>
  )
}

export default LoginPage;
