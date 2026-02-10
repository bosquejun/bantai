import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineContext } from "../context/define-context.js";
import { defineRule } from "./define-rule.js";
import { allow, deny } from "./results.js";

describe("defineRule", () => {
	it("should create a rule with name and evaluate function", async () => {
		const schema = z.object({
			age: z.number(),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "is-adult", async (input) => {
			if (input.age >= 18) {
				return allow({ reason: "User is an adult" });
			}
			return deny({ reason: "User is not an adult" });
		});

		expect(rule.name).toBe("is-adult");
		expect(typeof rule.evaluate).toBe("function");

		const result = await rule.evaluate({ age: 20 }, { tools: {} });
		expect(result.allowed).toBe(true);
		expect(result.reason).toBe("User is an adult");
	});

	it("should evaluate rule correctly with allow result", async () => {
		const schema = z.object({
			role: z.enum(["admin", "user"]),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "is-admin", async (input) => {
			if (input.role === "admin") {
				return allow({ reason: "User is an admin" });
			}
			return deny({ reason: "User is not an admin" });
		});

		const result = await rule.evaluate({ role: "admin" }, { tools: {} });
		expect(result.allowed).toBe(true);
		expect(result.reason).toBe("User is an admin");
	});

	it("should evaluate rule correctly with deny result", async () => {
		const schema = z.object({
			role: z.enum(["admin", "user"]),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "is-admin", async (input) => {
			if (input.role === "admin") {
				return allow({ reason: "User is an admin" });
			}
			return deny({ reason: "User is not an admin" });
		});

		const result = await rule.evaluate({ role: "user" }, { tools: {} });
		expect(result.allowed).toBe(false);
		expect(result.reason).toBe("User is not an admin");
	});

	it("should handle complex input schemas", async () => {
		const schema = z.object({
			user: z.object({
				id: z.string(),
				email: z.string(),
			}),
			permissions: z.array(z.string()),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "has-permission", async (input) => {
			if (input.permissions.includes("read")) {
				return allow({ reason: "User has read permission" });
			}
			return deny({ reason: "User does not have read permission" });
		});

		const result = await rule.evaluate(
			{
				user: { id: "1", email: "test@example.com" },
				permissions: ["read", "write"],
			},
			{ tools: {} },
		);

		expect(result.allowed).toBe(true);
		expect(result.reason).toBe("User has read permission");
	});

	it("should handle async operations in evaluate function", async () => {
		const schema = z.object({
			userId: z.string(),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "async-check", async (input) => {
			// Simulate async operation
			await new Promise((resolve) => setTimeout(resolve, 10));
			return allow({ reason: "Async check passed" });
		});

		const result = await rule.evaluate({ userId: "123" }, { tools: {} });
		expect(result.allowed).toBe(true);
		expect(result.reason).toBe("Async check passed");
	});

	it("should work with rules that have no reason", async () => {
		const schema = z.object({
			value: z.boolean(),
		});
		const context = defineContext(schema);

		const rule = defineRule(context, "simple-check", async (input) => {
			return input.value ? allow() : deny();
		});

		const allowResult = await rule.evaluate({ value: true }, { tools: {} });
		expect(allowResult.allowed).toBe(true);
		expect(allowResult.reason).toBeNull();

		const denyResult = await rule.evaluate({ value: false }, { tools: {} });
		expect(denyResult.allowed).toBe(false);
		expect(denyResult.reason).toBeNull();
	});

	it("should expose tools in evaluate context", async () => {
		const schema = z.object({
			value: z.number(),
		});

		const tools = {
			multiplier: 2,
			format: (n: number) => `v=${n}`,
		};

		const context = defineContext(schema, { tools });

		let seenFormatOutput: string | undefined;

		const rule = defineRule(context, "uses-tools", async (input, ctx) => {
			// access strongly-typed tools from context
			const product = input.value * ctx.tools.multiplier;
			seenFormatOutput = ctx.tools.format(product);

			return product > 10
				? allow({ reason: "above-threshold" })
				: deny({ reason: "below-threshold" });
		});

		const result = await rule.evaluate(
			{ value: 6 },
			{ tools: { ...tools } },
		);

		expect(result.allowed).toBe(true);
		expect(result.reason).toBe("above-threshold");
		expect(seenFormatOutput).toBe("v=12");
	});

	it("should allow narrowing based on evaluate context", async () => {
		const schema = z.object({
			flag: z.boolean(),
		});

		const tools = {
			audit: {
				log: (msg: string) => msg.toUpperCase(),
			},
		};

		const context = defineContext(schema, { tools });

		let logged: string | undefined;

		const rule = defineRule(context, "with-context", async (input, ctx) => {
			// compile-time type check: log returns string
			const upper: string = ctx.tools.audit.log(
				input.flag ? "true" : "false",
			);
			logged = upper;

			return input.flag ? allow() : deny();
		});

		await rule.evaluate({ flag: false }, { tools });

		expect(logged).toBe("FALSE");
	});
});

