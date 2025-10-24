import ErrorDisplay from "#src/components/ErrorDisplay/ErrorDisplay.tsx";
import useREST from "#src/hooks/useREST.ts";
import { Box, Button, LoadingOverlay } from "@mantine/core"
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface VerifyForm {
  token: string;
}

const VerifyAccountPage = () => {
  // const { user_id: userId, token } = useParams<{ user_id: string; token: string }>();
  const [searchParams] = useSearchParams();
  const { data, error, loading, submitFn } = useREST<VerifyForm, null>('POST', `/auth/verify/${searchParams.get('user_id')}/`);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.get('token') && searchParams.get('user_id')) {
      submitFn({ token: searchParams.get('token')! });
    } else {
      navigate('/auth/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <Box>
      <LoadingOverlay visible={loading} />
      <ErrorDisplay title="Error validating account" error={error} />
      {data && !error && !loading && (
        <Box>
          Your account has been successfully verified! Please continue to the login page.

          <Button fullWidth mt="xl" onClick={() => navigate('/auth/')}>
            Back to login
          </Button>
        </Box>
      )}

      {
        loading && (
          <Box>
            Verifying your account, please wait...
          </Box>
        )
      }
    </Box>
  )
}

export default VerifyAccountPage;