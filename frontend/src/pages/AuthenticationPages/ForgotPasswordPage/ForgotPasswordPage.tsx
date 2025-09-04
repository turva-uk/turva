import { Box, Button, Stack, TextInput } from "@mantine/core";
import { useNavigate } from "react-router";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  return (
    <Box>
      <Stack gap="sm">
        <TextInput label="Email" required />

        <Button fullWidth>
          Send recovery email
        </Button>

        <Button fullWidth variant="outline" onClick={() => navigate('/app/auth')}>
          Back to login
        </Button>
      </Stack>
    </Box>
  )
}

export default ForgotPasswordPage;
