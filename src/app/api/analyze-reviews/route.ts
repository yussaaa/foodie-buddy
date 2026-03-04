import { NextRequest, NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";

export interface ReviewMention {
  food: string;
  sentiment: "recommend" | "not_recommend";
}

export async function POST(request: NextRequest) {
  try {
    const { reviews, language = "zh" } = (await request.json()) as {
      reviews: string[];
      language: string;
    };

    if (!reviews?.length) {
      return NextResponse.json({ mentions: [] });
    }

    const langLabel = language === "zh" ? "简体中文" : "English";

    const reviewsText = reviews
      .map((r, i) => `${i + 1}. ${r}`)
      .join("\n\n");

    const systemPrompt = `You are a food review analyzer. Extract food and dish names from restaurant reviews and classify the reviewer's sentiment. Always respond in valid JSON format only.`;

    const userPrompt = `Analyze these ${reviews.length} restaurant review(s). For each review, extract all food and dish names mentioned.

For each food/dish found, classify sentiment as:
- "recommend" if the reviewer liked it, praised it, or ordered it repeatedly
- "not_recommend" if the reviewer disliked it, complained about it, or warned against it

Return all food names in ${langLabel}.

Return a JSON object with a "mentions" key containing an array of ${reviews.length} sub-arrays (one per review, in order). Use an empty array [] for reviews with no food mentions.

Reviews:
${reviewsText}

Respond with ONLY valid JSON (no markdown, no code blocks):
{"mentions": [[{"food": "...", "sentiment": "recommend"}], [], ...]}`;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const raw = response.choices[0].message.content ?? '{"mentions": []}';
    const data = JSON.parse(raw) as { mentions: ReviewMention[][] };

    // Normalise: ensure we have exactly one array per review
    const mentions: ReviewMention[][] = Array.from(
      { length: reviews.length },
      (_, i) => data.mentions?.[i] ?? []
    );

    return NextResponse.json({ mentions });
  } catch (err) {
    console.error("[/api/analyze-reviews]", err);
    // Soft fail — return empty mentions so the UI degrades gracefully
    return NextResponse.json({ mentions: [] });
  }
}
