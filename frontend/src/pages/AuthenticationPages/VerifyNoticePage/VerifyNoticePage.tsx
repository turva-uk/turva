import { UserAuthContext } from "#src/app/contexts/UserAuthContext.tsx";
import ErrorDisplay from "#src/components/ErrorDisplay/ErrorDisplay.tsx";
import useREST from "#src/hooks/useREST.ts";
import { Alert, Box, Button, LoadingOverlay, Title } from "@mantine/core";
import { useContext } from "react";
import { useNavigate } from "react-router";

const VerifyNoticePage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserAuthContext);
  const {
    success: resendSuccess,
    error: resendError,
    loading: resendLoading,
    submitFn: resendSubmitFn,
    resetData,
  } = useREST<{ resend: true }, null>("POST", `/auth/verify/${user?.id}/`);

  const handleResend = () => {
    resetData();
    resendSubmitFn({ resend: true });
  };

  return (
    <Box>
      <LoadingOverlay visible={resendLoading} />
      <Title order={2} mb="md">
        Welcome aboard, {user?.firstName || "User"}!
      </Title>
      {resendSuccess && (
        <Alert title="Verification Email Sent" color="green" mb="md">
          A new verification email has been sent to your email address.
        </Alert>
      )}
      <ErrorDisplay
        title="An error occurred while resending the verification email."
        error={resendError}
      />
      <p>
        A verification email has been sent to your email address. Please check
        your inbox and click on the verification link to activate your account.
      </p>
      <p>
        If you did not receive the email, please check your spam folder or
        request a new verification email.
      </p>

      <Button
        mt="md"
        fullWidth
        variant="outline"
        onClick={() => handleResend()}
      >
        Resend Verification Email
      </Button>
      <Button mt="md" fullWidth onClick={() => navigate("/auth/")}>
        Back to Login
      </Button>
    </Box>
  );
};

export default VerifyNoticePage;
