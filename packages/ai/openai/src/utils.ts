import { LLMGenerateTextInput } from "@bantai-dev/llm";
import { ResponseInput } from "openai/resources/responses/responses.js";

export function convertPromptToOpenAIMessages(
    prompt: LLMGenerateTextInput["prompt"]
): ResponseInput {
    return typeof prompt === "string"
        ? [{ role: "user", content: prompt }]
        : prompt.map((p) => ({
              role: p.role,
              content: p.content,
          }));
}
