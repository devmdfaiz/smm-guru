import { AxiosError } from "axios";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { HTTPResponseError } from "hono/types";
import type { ContentfulStatusCode } from "hono/utils/http-status";

interface ApiResponse<T> {
  error?: string;
  success: boolean;
  name: string;
  message: string;
  result: T;
}

export const errorHandler = async (err: Error | HTTPResponseError, c: Context) => {
  // Log the error details
  console.error("Caught error in error handler:", err);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: ApiResponse<any>;

  // Check for specific error types
  if (err instanceof ValidationError) {
    // Custom validation error response
    response = {
      success: false,
      error: "Validation Error",
      name: "Validation Error",
      message: err.message,
      result: err.details, // Add field-specific details if available
    };
    return c.json(response, err.status);
  }

  if (err instanceof AxiosError) {
    response = {
      success: false,
      error: "External API Error",
      name: "Axios Error",
      message: err.response?.data?.message || err.message,
      result: err.response?.data || null,
    };

    const statusCode = (err.status as ContentfulStatusCode) || 500;

    return c.json(response, { status: statusCode });
  }

  if (err instanceof SyntaxError) {
    // Handle syntax errors (e.g., invalid JSON payloads)
    response = {
      success: false,
      error: "Bad Request",
      name: "Syntax Error",
      message: "Invalid JSON syntax in the request body.",
      result: null,
    };
    return c.json(response, { status: 400 });
  }

  // Generic fallback error for unexpected issues
  response = {
    success: false,
    error: "Internal Server Error",
    name: err.name || "Error",
    message:
      "Something went wrong on our end. Please check result for more info.",
    result: err,
  };
  return c.json(response, { status: 500 });
};

// Custom ValidationError class
export class ValidationError extends HTTPException {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details: Record<string, any>;
  message: string;

  constructor(
    message: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    details: Record<string, any> = {},
    statusCode: ContentfulStatusCode = 500
  ) {
    const errorResponse = new Response(
      JSON.stringify({
        error: "Validation Error",
        message,
        details,
      }),
      {
        status: statusCode,
      }
    );
    super(statusCode, { res: errorResponse });
    this.details = details;
    this.message = message;
  }
}
