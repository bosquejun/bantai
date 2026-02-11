import { LLMGenerateTextInput, llmInputObjectSchema } from "@bantai-dev/llm";
import { ModelMessage, UIMessage } from "ai";
import { z } from "zod";

export function convertPromptToVercelAIMessages(
    prompt: LLMGenerateTextInput["prompt"]
): ModelMessage[] {
    return typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : prompt.map((p) => ({
              role: p.role,
              content: p.content,
          }));
}

export function convertUIMessagesToPrompt(uiMessages: UIMessage[]): LLMGenerateTextInput["prompt"] {
    return uiMessages.reduce(
        (acc, m) => {
            m.parts.forEach((p) => {
                if (p.type === "text") {
                    (acc as z.infer<typeof llmInputObjectSchema>[]).push({
                        role: m.role,
                        content: p.text,
                    });
                }
            });
            return acc;
        },
        [] as LLMGenerateTextInput["prompt"]
    );
}
