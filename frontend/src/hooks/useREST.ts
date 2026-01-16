import { useState } from "react";
import { camelCase, isArray, transform, isObject, snakeCase } from "lodash";
import { handleDates } from "../common/parseDates";
import { useNavigate } from "react-router";

interface RESTReturnType<InputType, returnType> {
  data: returnType | null;
  error: RESTError | null;
  loading: boolean;
  success: boolean;
  submitFn: (input?: InputType) => void;
  resetData: () => void;
}

export interface RESTError {
  detail: string | object;
  statusCode: string;
}

const camelize = (obj: Record<string, unknown>) =>
  transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    },
  );

export const snakecaseify = (obj: Record<string, unknown>) =>
  transform(
    obj,
    (result: Record<string, unknown>, value: unknown, key: string, target) => {
      const snakeKey = isArray(target) ? key : snakeCase(key);
      result[snakeKey] =
        isObject(value) && !(value instanceof Date)
          ? snakecaseify(value as Record<string, unknown>)
          : value;
    },
  );

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatDatesInObject(obj: any): any {
  if (obj instanceof Date) {
    // If the value is a Date object, format it
    const year = obj.getFullYear();
    const month =
      obj.getMonth() + 1 < 10 ? `0${obj.getMonth() + 1}` : obj.getMonth() + 1;
    const day = obj.getDate() < 10 ? `0${obj.getDate()}` : obj.getDate();
    return `${year}-${month}-${day}`;
  } else if (typeof obj === "object" && obj !== null) {
    // If the value is an object, recursively format dates in its properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = formatDatesInObject(obj[key]);
      }
    }
  }
  return obj;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSpacesNull(obj: any): any {
  if (typeof obj === "string" && obj.trim() === "") {
    return null;
  } else if (typeof obj === "object" && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = makeSpacesNull(obj[key]);
      }
    }
  }
  return obj;
}

function useREST<InputType, ReturnType>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  resource: string,
  isBlob: boolean = false,
): RESTReturnType<InputType, ReturnType> {
  const [data, setData] = useState<ReturnType | null>(null);
  const [error, setError] = useState<RESTError | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  // I've added a success flag because there's a couple of endpoints where they're returning "204 no content"
  const [success, setSuccess] = useState<boolean>(false);
  const navigate = useNavigate();

  const resetData = () => {
    setData(null);
    setError(null);
    setLoading(false);
    setSuccess(false);
  };

  const submitFn = async (input?: InputType) => {
    setLoading(true);
    try {
      // Send the HTTP request
      const params: {
        method: "GET" | "POST" | "PATCH" | "DELETE";
        headers: {
          "Content-Type": "application/json";
        };
        body?: string;
      } = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };
      let queryUrl = "";
      if (import.meta.env.MODE === "development") {
        queryUrl = `https://localhost${import.meta.env.BASE_URL}api${resource}`;
      } else {
        queryUrl = `https://api.turva.org/${resource}`;
      }

      if (input) {
        if (method !== "GET") {
          params["body"] = JSON.stringify(
            snakecaseify(formatDatesInObject(makeSpacesNull(input))),
            null,
            2,
          );
        } else {
          // If the method is GET, we don't need to send a body
          // but we should convert the input to a query string
          if (input) {
            const query = new URLSearchParams(
              snakecaseify(formatDatesInObject(input)) as Record<
                string,
                string
              >,
            );
            queryUrl += `?${query.toString()}`;
          }
        }
      }

      console.debug(`Sending ${method} request to ${queryUrl}`);
      const res = await fetch(queryUrl, params);

      if (res.status === 401 && window.location.pathname !== "/auth") {
        // Clear user data and redirect to login
        localStorage.removeItem("user");
        setData(null);
        const parsedRes: RESTError = await res.json();
        setError({ detail: parsedRes?.detail, statusCode: "401" });
        setLoading(false);
        setSuccess(false);
        // If the current page is the login page, don't redirect
        if (window.location.pathname !== "/auth") {
          navigate("/auth", { replace: true });
        }
      }

      // If the response's status code is not 2xx, set the error
      if (!res.ok) {
        try {
          const parsedRes: RESTError = await res.json();
          setError({
            detail: parsedRes.detail,
            statusCode: res.status.toString(),
          });
        } catch (e) {
          console.error(e);
          setError({
            detail: res.statusText,
            statusCode: res.status.toString(),
          });
        }

        setLoading(false);
      } else {
        // Parse the response
        if (res.status === 204 || method == "PATCH") {
          // If nothing is returned but we have a successful status code (2xx), set the success flag and return
          setSuccess(true);
          setLoading(false);
          return;
        }
        if (isBlob) {
          const parsedRes = await res.blob();
          setData(parsedRes as ReturnType);
          setSuccess(true);
          setLoading(false);
          return;
        }
        const parsedRes = camelize(await res.json()) as ReturnType & RESTError;
        // If the response has a detail field, it is an error
        if (parsedRes.detail) {
          setError(
            parsedRes.detail
              ? { detail: parsedRes.detail, statusCode: res.status.toString() }
              : { detail: res.statusText, statusCode: res.status.toString() },
          );
          // console.error(parsedRes);
        } else {
          // Otherwise set the data and the success flags
          setData(handleDates(parsedRes) as ReturnType);
          setSuccess(true);
        }
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError({ detail: e.message, statusCode: "0" });
      } else {
        setError({ detail: e as string, statusCode: "0" });
      }
      // console.error(e);
    }
    setLoading(false);
  };

  return { success, data, error, loading, submitFn, resetData };
}

export default useREST;
