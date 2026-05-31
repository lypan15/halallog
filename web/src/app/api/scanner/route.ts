// server-side proxy for Claude Vision halal scan
import Anthropic from "@anthropic-ai/sdk";

const PROMPT = `You are a halal food inspector. Examine the image, which may show a food product label, an ingredients list, or a restaurant menu.

Steps:
1. Read any visible ingredients / menu / food label text in the image.
2. Determine the halal status as exactly one of: "Halal", "Haram", "Doubtful".
3. Err on the side of "Doubtful" when uncertain — never guess "Halal".
4. If the image is unreadable or not food-related, return status "Doubtful" with a reason saying so.

Respond ONLY in strict JSON (no markdown, no code fences, no prose) with exactly this shape:
{ "status": "Halal" | "Haram" | "Doubtful", "confidence": "high" | "medium" | "low", "reason": string, "flaggedIngredients": string[] }

"reason" must be one or two short sentences in plain English. "flaggedIngredients" lists any concerning ingredients (empty array if none).`;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  let imageBase64: string;
  let mediaType: string;
  try {
    const body = await req.json();
    imageBase64 = body.imageBase64;
    mediaType = body.mediaType;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!imageBase64 || !mediaType) {
    return Response.json(
      { error: "Both imageBase64 and mediaType are required." },
      { status: 400 }
    );
  }

  const anthropic = new Anthropic({ apiKey });

  let text: string;
  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: imageBase64,
              },
            },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    // Collect text from the response content blocks.
    text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "Claude Vision request failed.", detail },
      { status: 502 }
    );
  }

  // Strip ```json fences if Claude wrapped the response.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Response.json(parsed);
  } catch {
    return Response.json(
      { error: "Failed to parse Claude response as JSON.", raw: text },
      { status: 502 }
    );
  }
}
