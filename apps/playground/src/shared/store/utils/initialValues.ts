import type { Policy, Rule } from "../../types";
import { lintCode } from "./linting";

export const DEFAULT_CONTEXT_DEF = `const appContext = defineContext(
  z.object({
    userId: z.string(),
    role: z.enum(['admin', 'user', 'guest']),
    resource: z.object({
      id: z.string(),
      ownerId: z.string(),
      isPublic: z.boolean()
    }),
    isBanned: z.boolean().optional()
  })
);`;

export const INITIAL_RULE = (name: string, customCode?: string): Rule => {
    const code =
        customCode ||
        `const ${name
            .split("-")
            .map((word, idx) =>
                idx === 0
                    ? word.charAt(0).toLowerCase() + word.slice(1)
                    : word.charAt(0).toUpperCase() + word.slice(1)
            )
            .join(
                ""
            )} = defineRule(appContext, "${name}", async (input, ctx) => {\n  return input.role === 'admin';\n});`;
    return {
        id: crypto.randomUUID(),
        name,
        code,
        enabled: true,
        errors: lintCode(code),
        isDirty: false,
    };
};

export const INITIAL_POLICY = (
    name: string,
    rules: string[] = ["is-admin"],
    effect: "ALLOW" | "DENY" = "ALLOW"
): Policy => ({
    id: crypto.randomUUID(),
    name,
    code: `const ${name
        .split("-")
        .map((word, idx) =>
            idx === 0
                ? word.charAt(0).toLowerCase() + word.slice(1)
                : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join(
            ""
        )} = definePolicy(appContext, "${name}", ${JSON.stringify(rules)}, { effect: "${effect}" });`,
    enabled: true,
    errors: [],
    isDirty: false,
});

export const INITIAL_JSON = JSON.stringify(
    {
        userId: "u_123",
        role: "admin",
        isBanned: false,
        resource: {
            id: "r_999",
            ownerId: "u_123",
            isPublic: false,
        },
    },
    null,
    2
);
