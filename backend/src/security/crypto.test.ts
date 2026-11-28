import { describe, expect, it } from "vitest";
import { InvalidAccessTokenError, verifyAccessToken } from "./crypto.js";

describe("access token verification", () => {
  it.each(["", "not-a-jwt", "a.b.c", "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.e30.signature"])(
    "rejects malformed or unsupported token: %s",
    token => {
      expect(() => verifyAccessToken(token)).toThrow(InvalidAccessTokenError);
    }
  );
});
