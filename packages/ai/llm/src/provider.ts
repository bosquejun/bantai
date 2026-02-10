import { ExtractContextShape } from "@bantai-dev/core";
import { z } from "zod";
import { WithLLMContext } from "./context.js";
import { LLMGenerateTextInput, LLMGenerateTextOutput } from "./schema.js";

export type LLMProviderInput<TContext extends WithLLMContext<TContext>> = Omit<
    z.infer<z.ZodObject<ExtractContextShape<TContext>>>,
    "rateLimit"
> & { llm: LLMGenerateTextInput };

export interface LLMProvider<TContext extends WithLLMContext<TContext> = WithLLMContext<any>> {
    generateText(input: LLMProviderInput<TContext>): Promise<LLMGenerateTextOutput>;
    defaultModel: string;
    providerName: string;
}
