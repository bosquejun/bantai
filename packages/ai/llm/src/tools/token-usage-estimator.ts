import { LLMGenerateTextInput } from "@/schema.js";
import { estimateTokenCount } from "tokenx";
import { serializeMessages } from "./serialize-inputs.js";

export const tokenUsageEstimator = async (prompt: LLMGenerateTextInput["prompt"]) => {
    const serializedInput = serializeMessages(prompt);

    return estimateTokenCount(serializedInput);
};
