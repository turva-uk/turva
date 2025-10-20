import ErrorDisplay from "#src/components/ErrorDisplay/ErrorDisplay.tsx";
import useREST from "#src/hooks/useREST.ts";
import { Box, Button, LoadingOverlay, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useNavigate } from "react-router";

interface ForgotPasswordForm {
  email: string;
}

interface ForgotPasswordAPIRequest {
  email: string;
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const {
    success: emailSent,
    loading: sendingEmail,
    error: sendEmailError,
    submitFn: requestRecoveryEmail
  } = useREST<ForgotPasswordAPIRequest, null>('POST', '/auth/forgot/');
  const form = useForm<ForgotPasswordForm>({
    initialValues: {
      email: ''
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'The email specified is not valid')
    }
  });

  if (emailSent) {
    return (
      <Box>
        <Stack gap="sm">
          <Text size="sm">
            If an account matching the email address you provided exists, a password recovery email has been sent. Please check your inbox and follow the instructions to reset your password.
          </Text>
          <Button fullWidth variant="outline" mt="md" onClick={() => navigate('/auth')}>
            Back to login
          </Button>
        </Stack>
      </Box>
    )
  };

  return (
    <Box>
      <LoadingOverlay visible={sendingEmail} />
      <ErrorDisplay title="An error occured sending the recovery email" error={sendEmailError} />
      <form onSubmit={form.onSubmit(requestRecoveryEmail)}>
        <Stack gap="sm">
          <Text size="sm">
            Enter your email address below and if it matches an existing account, we'll send you an email with instructions to reset your password.
          </Text>
          <TextInput label="Email" {...form.getInputProps('email')} key={form.key('email')} />

          <Button fullWidth mt="md" type="submit">
            Send recovery email
          </Button>

          <Button fullWidth variant="outline" onClick={() => navigate('/auth')}>
            Back to login
          </Button>
        </Stack>
      </form>
    </Box>
  )
}

export default ForgotPasswordPage;
