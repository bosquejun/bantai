import { LLMGenerateTextInput } from "@/schema.js";

export function serializeMessages(prompt: LLMGenerateTextInput["prompt"]) {
    const messages = typeof prompt === "string" ? [{ role: "user", content: prompt }] : prompt;
    return (
        "<MESSAGES>\n" +
        messages
            .map((m) => {
                let body = "";

                if (typeof m.content === "string") {
                    body = m.content;
                }

                return `[ROLE=${m.role}]\n${body}\n[/ROLE]`;
            })
            .join("\n") +
        "\n</MESSAGES>\n"
    );
}
