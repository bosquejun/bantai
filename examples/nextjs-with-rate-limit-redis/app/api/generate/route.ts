import { aiGenerationPolicy } from "@/lib/bantai/policy";
import { evaluatePolicy } from "@bantai-dev/core";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    // const { prompt } = await request.json();
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    //     },
    // });

    const result = await evaluatePolicy(aiGenerationPolicy, {
        endpoint: "/api/generate",
        method: "POST",
        userId: "123",
        rateLimit: {
            type: "token-bucket",
            cost: 50,
        },
    });

    console.log(result);

    if (!result.isAllowed) {
        return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    return NextResponse.json({ message: "Request allowed" });
    // return NextResponse.json(response);
}
