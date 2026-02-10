import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineContext } from "./define-context.js";

describe("defineContext", () => {
	it("should create a context definition with schema", () => {
		const schema = z.object({
			age: z.number(),
			name: z.string(),
		});

		const context = defineContext(schema);

		expect(context).toBeDefined();
		expect(context.schema).toBe(schema);
		expect(context.defaultValues).toEqual({});
	});

	it("should create a context with default values", () => {
		const schema = z.object({
			age: z.number(),
			name: z.string(),
			role: z.enum(["admin", "user"]).optional(),
		});

		const defaultValues = {
			age: 18,
			role: "user" as const,
		};

		const context = defineContext(schema, { defaultValues });

		expect(context.defaultValues).toEqual(defaultValues);
	});

	it("should validate default values against schema", () => {
		const schema = z.object({
			age: z.number(),
			name: z.string(),
		});

		const defaultValues = {
			age: 18,
			// name is missing, which is fine for partial
		};

		const context = defineContext(schema, { defaultValues });

		expect(context.defaultValues).toEqual({ age: 18 });
	});

	it("should reject invalid default values", () => {
		const schema = z.object({
			age: z.number(),
			name: z.string(),
		});

		expect(() => {
			defineContext(schema, {
				defaultValues: {
					age: "invalid" as unknown as number,
				},
			});
		}).toThrow();
	});

	it("should handle complex schemas", () => {
		const schema = z.object({
			user: z.object({
				id: z.string(),
				email: z.string().email(),
			}),
			permissions: z.array(z.string()),
		});

		const context = defineContext(schema);

		expect(context.schema).toBe(schema);
	});

	it("should handle empty schema", () => {
		const schema = z.object({});

		const context = defineContext(schema);

		expect(context.schema).toBe(schema);
		expect(context.defaultValues).toEqual({});
	});

	it("should attach tools to the context", () => {
		const schema = z.object({
			value: z.number(),
		});

		const tools = {
			audit: {
				log: (msg: string) => msg.toUpperCase(),
			},
			randomNumber: () => 42,
		};

		const context = defineContext(schema, { tools });

		expect(context.tools).toBeDefined();
		expect(context.tools).toHaveProperty("audit");
		expect(context.tools.audit?.log("ok")).toBe("OK");
		expect(context.tools.randomNumber()).toBe(42);
	});

	it("should preserve tools type information", () => {
		const schema = z.object({
			value: z.number(),
		});

		const tools = {
			audit: {
				log: (msg: string) => msg,
			},
		};

		const context = defineContext(schema, { tools });

		// Type-level assertion: tools are correctly typed
		const _log: string = context.tools.audit.log("hello");
		expect(_log).toBe("hello");
	});
});

