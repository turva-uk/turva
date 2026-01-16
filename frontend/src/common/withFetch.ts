import { handleDates } from "./parseDates";
import {
  buildQuery,
  camelize,
  handleErrorResponses,
  UnauthenticatedError,
} from "./restUtils";
import type { RESTError } from "./restUtils";

interface WithFetchProps<InputType> {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  resource: string;
  redirectOnAuthFail?: boolean;
  isBlob?: boolean;
  input?: InputType;
}

interface WithFetchReturnType<ReturnType> {
  data: ReturnType | null;
  success: boolean;
  error: RESTError | null;
}

export async function withFetch<InputType, ReturnType>({
  method,
  resource,
  redirectOnAuthFail = true,
  isBlob = false,
  input,
}: WithFetchProps<InputType>): Promise<WithFetchReturnType<ReturnType>> {
  const { queryUrl, params } = buildQuery<InputType>(method, resource, input);
  console.debug(`Sending ${method} request to ${queryUrl}`);

  let response = null;
  try {
    response = await fetch(queryUrl, {
      ...params,
      credentials: "include",
    });
  } catch (e) {
    console.error("Error fetching data:", e);
    return {
      data: null,
      success: false,
      error: {
        detail: "Network error",
        title: "Network error",
        statusCode: "0",
        code: "NETWORK_ERROR",
      },
    };
  }

  try {
    const errors = await handleErrorResponses(response);
    if (errors) {
      return {
        data: null,
        success: false,
        error: errors,
      };
    }
  } catch (e) {
    if (e instanceof UnauthenticatedError) {
      // If the response's status code is 401, the user is not authenticated
      // so we should clear the user data and redirect to the login page
      if (redirectOnAuthFail) {
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    } else {
      // Re-throw the error if it's not an UnauthenticatedError
      // This is important because we don't want to catch all errors and handle them
      // here
      throw e;
    }
  }

  if (isBlob) {
    const blob = await response.blob();
    return {
      data: blob as ReturnType,
      success: true,
      error: null,
    };
  }

  const parsedRes = camelize(await response.json()) as ReturnType & RESTError;

  return {
    data: handleDates(parsedRes) as ReturnType,
    success: true,
    error: null,
  };
}
