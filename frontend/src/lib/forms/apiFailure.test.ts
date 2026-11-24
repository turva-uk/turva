import { describe, expect, it } from "vitest";

import { ApiError } from "@/api/client";
import { apiFailure } from "./apiFailure";

type Values = { email: string; password: string };

describe("apiFailure", () => {
  it("puts the server's message in the status card", () => {
    const result = apiFailure<Values>(
      new ApiError(400, "Unable to sign in with those details."),
      "Could not sign you in",
      ["email", "password"],
    );

    expect(result.state).toBe("error");
    expect(result.message).toEqual({
      title: "Could not sign you in",
      description: "Unable to sign in with those details.",
    });
  });

  it("puts each field's messages under that field", () => {
    const result = apiFailure<Values>(
      new ApiError(400, "Please correct the fields below.", {
        email: ["Enter a valid email address.", "It is too long."],
      }),
      "Could not create your account",
      ["email", "password"],
    );

    expect(result.fieldErrors).toEqual({
      email: "Enter a valid email address. It is too long.",
    });
  });

  it("keeps a message for a field the form does not have, in the status card", () => {
    const result = apiFailure<Values>(
      new ApiError(400, "Please correct the fields below.", {
        uid: ["This reset link is invalid."],
      }),
      "Could not change your password",
      ["email", "password"],
    );

    expect(result.fieldErrors).toEqual({});
    expect(result.message.description).toBe(
      "Please correct the fields below. This reset link is invalid.",
    );
  });

  it("throws on anything that is not a refused request", () => {
    const failure = new TypeError("Failed to fetch");

    expect(() => apiFailure<Values>(failure, "Could not sign you in", ["email"])).toThrow(
      failure,
    );
  });
});
