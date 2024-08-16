import { describe, test, expect } from "vitest";
import { buildEnpointString, getRegion, validateRegion } from "../utils";

describe("utils", () => {
  test("getRegion", () => {
    const expected = "us-test";
    expect(getRegion(`test-url/${expected}`)).toBe(expected);
    expect(getRegion(`test-url/${expected}/random-slug`)).toBe(expected);
  });

  test("validateRegion", () => {
    expect(validateRegion("us-east")).toBe(true);
    expect(validateRegion("us-test-2")).toBe(false);
  });

  test("buildEnpointString", () => {
    const region = "us-east";
    const host = "test-host.com";
    expect(buildEnpointString(region, host)).toBe(
      `https://data--${region}.${host}`
    );
  });
});
