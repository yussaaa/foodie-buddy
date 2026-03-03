import OpenAI from "openai";

// 单例模式，避免重复创建客户端
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export interface AIRestaurantInfo {
  cuisine_type: string;
  introduction: string;
  history: string;
  signature_dishes: Array<{ name: string; search_name: string; description: string }>;
  nutrition_highlights: string;
  dietary_notes: string;
}

/**
 * 调用 OpenAI 生成餐厅 & 菜系介绍
 */
export async function generateRestaurantInfo(params: {
  name: string;
  address?: string | null;
  types?: string[];
  rating?: number | null;
  language: "zh" | "en";
}): Promise<AIRestaurantInfo> {
  const { name, address, types, rating, language } = params;
  const langLabel = language === "zh" ? "简体中文" : "English";

  const systemPrompt = `You are an expert culinary historian and food critic.
Your task is to provide detailed, accurate, and engaging information about restaurants and their cuisines.
Always respond in valid JSON format with no markdown formatting.`;

  const userPrompt = `Restaurant details:
- Name: ${name}
- Address: ${address || "Unknown location"}
- Categories: ${types?.join(", ") || "Restaurant"}
- Rating: ${rating ?? "N/A"}

Please provide a comprehensive guide in ${langLabel}.
Respond with ONLY a JSON object (no markdown, no code blocks) with these exact fields:

{
  "cuisine_type": "Brief cuisine label (e.g., 日本料理, Italian, Sichuan Chinese) - max 20 chars",
  "introduction": "2-3 engaging paragraphs introducing this restaurant and its cuisine style. Include what makes it unique.",
  "history": "2-3 paragraphs about the cultural and historical background of this cuisine type. Include origin, evolution, and cultural significance.",
  "signature_dishes": [
    {
      "name": "Dish name in ${langLabel} (for display)",
      "search_name": "Dish name in its ORIGINAL menu language, e.g. English for Western/Japanese/Italian restaurants, Chinese for Chinese restaurants — used for image search only",
      "description": "60-80 word description of the dish, its ingredients, taste profile, and cultural significance"
    }
  ],
  "nutrition_highlights": "2 paragraphs summarizing the typical nutritional characteristics of this cuisine. Include macronutrients, common ingredients, and general health impact.",
  "dietary_notes": "1-2 paragraphs covering: common allergens in this cuisine, suitability for vegetarians/vegans, gluten considerations, and general dietary advice."
}`;

  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 2000,
  });

  const raw = response.choices[0].message.content ?? "{}";
  return JSON.parse(raw) as AIRestaurantInfo;
}
