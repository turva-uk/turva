import { camelCase, isArray, isObject, transform, snakeCase } from "lodash";

export interface RESTError {
  title?: string,
  detail?: string,
  statusCode: string,
  code?: string,
}

/**
 * Converts the keys of an object to camelCase
 * @param obj 
 * @returns object with camelCase keys
 */
export const camelize = (obj: Record<string, unknown>) => (
  transform(obj, (result: Record<string, unknown>, value: unknown, key: string, target) => {
    const camelKey = isArray(target) ? key : camelCase(key);
    result[camelKey] = isObject(value) ? camelize(value as Record<string, unknown>) : value;
  })
);

/**
 * Converts the keys of an object to snake_case
 * @param obj 
 * @returns object with snake_case keys
 */
export const snakecaseify = (obj: Record<string, unknown>) => (
  transform(obj, (result: Record<string, unknown>, value: unknown, key: string, target) => {
    const snakeKey = isArray(target) ? key : snakeCase(key);
    result[snakeKey] = isObject(value) && !(value instanceof Date) ? snakecaseify(value as Record<string, unknown>) : value;
  }
  ))

/**
 * Formats dates in an object to be sent to the backend. This is necessary to take
 * into account timezones and other date formatting issues.
 * @param obj 
 * @returns object with dates formatted as strings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatDatesInObject(obj: any): any {
  if (obj instanceof Date) {
    // If the value is a Date object, format it
    const year = obj.getFullYear();
    const month = (obj.getMonth() + 1) < 10 ? `0${obj.getMonth() + 1}` : obj.getMonth() + 1;
    const day = obj.getDate() < 10 ? `0${obj.getDate()}` : obj.getDate();
    return `${year}-${month}-${day}`;
  } else if (typeof obj === 'object' && obj !== null) {
    // If the value is an object, recursively format dates in its properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = formatDatesInObject(obj[key]);
      }
    }
  }
  return obj;
}

/**
 * Converts empty strings to null in an object
 * @param obj 
 * @returns object with empty strings converted to null
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeSpacesNull(obj: any): any {
  if (typeof obj === 'string' && obj.trim() === '') {
    return null;
  } else if (typeof obj === 'object' && obj !== null) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = makeSpacesNull(obj[key]);
      }
    }
  }
  return obj;
}

export function buildQuery<InputType>(method: 'POST'|'GET'|'PATCH'|'DELETE', resource: string, input?: InputType) {
  // Build the query URL
  // let queryUrl = `${import.meta.env.BASE_URL}/api${resource}`;
  // if dev, use localhost
  let queryUrl = '';
  if (import.meta.env.MODE === 'development') {
    queryUrl = `https://localhost${import.meta.env.BASE_URL}api${resource}`;
  } else {
    queryUrl = `https://api.turva.org/${resource}`;
  }

  // Build parameters
  const params: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    headers: {
      "Content-Type": "application/json",
    },
    body?: string,
  } = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  }

  // If an input has been specified
  if (input) {
    // and the method is not GET, clean the input and add it to the request body
    if (method !== 'GET') {
      params['body'] = JSON.stringify(snakecaseify(formatDatesInObject(makeSpacesNull(input))), null, 2);
    } else {
      // If the method is GET, we don't need to send a body
      // but we should convert the input to a query string
      if (input) {
        const query = new URLSearchParams(snakecaseify(formatDatesInObject(input)) as Record<string, string>);
        queryUrl += `?${query.toString()}`;
      }
    }
  }
  return {queryUrl, params};
}

export class UnauthenticatedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthenticatedError';
  }
}

export async function handleErrorResponses(res: Response): Promise<RESTError | null> {
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('user');
      // throw new UnauthenticatedError('Request failed with status 401');
    }
    try {
      const parsedRes: RESTError = await res.json();
      return {
        detail: parsedRes.detail || parsedRes.title,
        statusCode: res.status.toString(),
        code: parsedRes?.code,
      }
    } catch (e) {
      console.error(e);
      return {
        detail: res.statusText,
        statusCode: res.status.toString(),
      };
    }
  }

  return null;
}

export async function handleDataResponses<ReturnType>(res: Response): Promise<ReturnType | null> {
  if (!res.ok) {
    return null;
  }
  // If the response's status code is 204, the user is not authenticated
  // so we should clear the user data and redirect to the login page
  if (res.status === 204) {
    return null;
  }
  // Parse the response
  // parse the return data from JSON and cast it to the ReturnType
  const parsedRes = camelize(await res.json()) as ReturnType & RESTError;
  return parsedRes;
}