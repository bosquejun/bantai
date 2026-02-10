import { describe, it, expect } from "vitest";
import { allow, deny } from "./results.js";

describe("allow", () => {
    it("should create an allowed result without reason", () => {
        const result = allow();

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeNull();
    });

    it("should create an allowed result with reason", () => {
        const reason = "User has valid credentials";
        const result = allow({ reason });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBe(reason);
    });

    it("should create an allowed result with null reason explicitly", () => {
        const result = allow({ reason: null });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBeNull();
    });

    it("should create an allowed result with empty string reason", () => {
        const result = allow({ reason: "" });

        expect(result.allowed).toBe(true);
        expect(result.reason).toBe("");
    });
});

describe("deny", () => {
    it("should create a denied result without reason", () => {
        const result = deny();

        expect(result.allowed).toBe(false);
        expect(result.reason).toBeNull();
    });

    it("should create a denied result with reason", () => {
        const reason = "User is not authorized";
        const result = deny({ reason });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe(reason);
    });

    it("should create a denied result with null reason explicitly", () => {
        const result = deny({ reason: null });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBeNull();
    });

    it("should create a denied result with empty string reason", () => {
        const result = deny({ reason: "" });

        expect(result.allowed).toBe(false);
        expect(result.reason).toBe("");
    });
});
