import type { BantaiError } from "../../types";

export const lintJson = (json: string): BantaiError[] => {
    if (!json.trim()) return [{ message: "JSON input cannot be empty" }];
    try {
        JSON.parse(json);
        return [];
    } catch (e: any) {
        const match = e.message.match(/at position (\d+)/);
        const pos = match ? parseInt(match[1]) : undefined;

        let line: number | undefined;
        if (pos !== undefined) {
            line = json.substring(0, pos).split("\n").length;
        }

        return [
            {
                message: e.message,
                line,
                source: "JSON Syntax",
            },
        ];
    }
};

export const lintCode = (code: string): BantaiError[] => {
    const errors: BantaiError[] = [];
    const lines = code.split("\n");

    if (!code.trim()) {
        errors.push({ message: "Code cannot be empty" });
        return errors;
    }

    if (code.includes("eval(")) {
        const lineNum = lines.findIndex((l) => l.includes("eval(")) + 1;
        errors.push({
            message: "Security risk: 'eval' is strictly prohibited in Bantai rules.",
            line: lineNum,
        });
    }

    if (code.includes("console.")) {
        const lineNum = lines.findIndex((l) => l.includes("console.")) + 1;
        errors.push({
            message:
                "Side-effects detected: 'console' methods are not available in the policy sandbox.",
            line: lineNum,
        });
    }

    if (code.includes("var ")) {
        const lineNum = lines.findIndex((l) => l.includes("var ")) + 1;
        errors.push({
            message: "Syntax error: 'var' is deprecated. Use 'const' or 'let'.",
            line: lineNum,
        });
    }

    if (code.includes("rule(") && !code.includes("(ctx)") && !code.includes("ctx =>")) {
        errors.push({
            message: "Reference error: Policy rules must accept a 'ctx' parameter.",
            line: 1,
        });
    }

    const openBrackets = (code.match(/\{/g) || []).length;
    const closeBrackets = (code.match(/\}/g) || []).length;
    if (openBrackets !== closeBrackets) {
        errors.push({
            message: `Grammar error: Unbalanced curly braces. Found ${openBrackets} '{' and ${closeBrackets} '}'.`,
        });
    }

    return errors;
};
