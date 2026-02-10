import { LLMGenerateTextInput } from "@bantai-dev/llm";
import { ModelMessage } from "ai";

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
