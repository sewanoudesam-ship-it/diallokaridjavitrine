import { describe, expect, it } from "vitest";
import { withTimeout } from "../src/lib/with-timeout";

describe("withTimeout", () => {
  it("returns a completed auth result", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 100)).resolves.toBe("ok");
  });

  it("rejects an operation that never responds", async () => {
    await expect(withTimeout(new Promise(() => {}), 5)).rejects.toThrow("AUTH_REQUEST_TIMEOUT");
  });
});
