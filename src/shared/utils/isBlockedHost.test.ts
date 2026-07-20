import { describe, expect, it } from "vitest";
import { isBlockedHost } from "@/shared/utils/isBlockedHost";

describe("isBlockedHost", () => {
  it("blocks localhost and loopback addresses", () => {
    expect(isBlockedHost("localhost")).toBe(true);
    expect(isBlockedHost("127.0.0.1")).toBe(true);
    expect(isBlockedHost("0.0.0.0")).toBe(true);
  });

  it("blocks private IP-literal ranges", () => {
    expect(isBlockedHost("10.0.0.5")).toBe(true);
    expect(isBlockedHost("172.16.0.1")).toBe(true);
    expect(isBlockedHost("172.31.255.255")).toBe(true);
    expect(isBlockedHost("192.168.1.1")).toBe(true);
    expect(isBlockedHost("169.254.1.1")).toBe(true);
  });

  it("allows public hosts and IPs outside the private ranges", () => {
    expect(isBlockedHost("www.loja.example.com")).toBe(false);
    expect(isBlockedHost("8.8.8.8")).toBe(false);
    expect(isBlockedHost("172.32.0.1")).toBe(false);
    expect(isBlockedHost("172.15.255.255")).toBe(false);
  });
});
