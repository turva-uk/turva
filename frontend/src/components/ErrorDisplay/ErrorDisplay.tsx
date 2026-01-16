import { useState } from "react";
import type { ReactNode } from "react";
import { Alert, Anchor, Box, Collapse, Text } from "@mantine/core";
import type { RESTError } from "../../hooks/useREST";

interface ErrorDisplayProps {
  title: string;
  error: string | RESTError | null;
  [key: string]: unknown;
}

const ErrorDisplay = ({ title, error, ...rest }: ErrorDisplayProps) => {
  const [showDetails, setShowDetails] = useState(false);
  if (error === null) {
    return null;
  }

  let errorMessage: ReactNode = <></>;
  if (typeof error === "string") {
    errorMessage = <>{error}</>;
  }
  if (typeof error === "object") {
    errorMessage = (
      <>
        <Box>
          {typeof error.detail === "string"
            ? error.detail
            : "An error occurred"}
        </Box>
        <Box mt="sm">
          <Anchor
            size="sm"
            onClick={() => setShowDetails((current) => !current)}
          >
            {showDetails ? <>&#9660;</> : <>&#9654;</>} More details
          </Anchor>
          <Collapse in={showDetails}>
            <Box mt="sm">
              <Text size="sm" ms="sm">
                HTTP error code: {error.statusCode}
              </Text>
              {typeof error.detail !== "string" && (
                <Text size="sm" ms="sm">
                  {JSON.stringify(error.detail)}
                </Text>
              )}
            </Box>
          </Collapse>
        </Box>
      </>
    );
  }

  return (
    <Alert color="red" title={title} mb="sm" {...rest}>
      {errorMessage}
    </Alert>
  );
};

export default ErrorDisplay;
