/**
 * DocDeck AI designer: a Cloudflare Worker that turns a document into a
 * professional slide plan with Claude. The static site posts the document's
 * text here; the Anthropic API key stays in this Worker as a secret.
 *
 * Keep DESIGN_RULES in sync with the copy in app.html (used on claude.ai).
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN: string;
}

const MAX_DOC_CHARS = 150_000;

const TEMPLATES = ["business", "tech", "science", "education", "health", "creative", "nature", "legal", "general"] as const;

const Bullet = z.object({ lead: z.string().optional(), text: z.string() });
const Item = z.object({ heading: z.string(), text: z.string() });
const Side = z.object({ heading: z.string(), points: z.array(z.string()) });
const Slide = z.object({
  layout: z.enum(["section", "bullets", "stats", "cards", "steps", "comparison", "quote", "statement"]),
  title: z.string(),
  kicker: z.string(),
  notes: z.string(),
  bullets: z.array(Bullet).optional(),
  stats: z.array(z.object({ value: z.string(), caption: z.string() })).optional(),
  cards: z.array(Item).optional(),
  steps: z.array(Item).optional(),
  left: Side.optional(),
  right: Side.optional(),
  quote: z.string().optional(),
  by: z.string().optional(),
  text: z.string().optional(),
});
const Deck = z.object({
  template: z.enum(TEMPLATES),
  reason: z.string(),
  title: z.string(),
  subtitle: z.string(),
  slides: z.array(Slide),
});

const DESIGN_RULES = `You are a senior presentation designer. Turn the document below into a clear, professional slide deck.

Content
- Use only facts from the document. Never invent numbers, names, dates or claims.
- One idea per slide. Aim for roughly one slide per 150-250 words of source, between 4 and 18 content slides.
- Write slide copy, not prose. Titles state the point in 8 words or fewer ("Revenue grew 22% in 2026", not "Revenue").
- Bullets: 3-5 per slide, 14 words or fewer each, no trailing periods. Use "lead" for a short bold label (2-4 words) when points have natural labels; otherwise leave it out.
- Put the fuller explanation in "notes": 2-4 sentences a presenter can say, drawn from the document.
- "kicker" is a short label above the title (the part of the talk it belongs to, 4 words or fewer), or "".

Layouts: choose the one that fits each slide's content, and avoid the same layout more than twice in a row.
- section: a divider before a major part that has 2 or more slides. Title only.
- bullets: 3-5 points.
- stats: 2-4 headline numbers from the document. "value" is 8 characters or fewer ("$8.4M", "22%", "14 mo"); "caption" is 12 words or fewer.
- cards: 3-4 parallel ideas (pillars, options, features). "heading" 4 words or fewer, "text" 18 words or fewer.
- steps: 3-5 ordered steps, phases or dates, in order. "heading" 4 words or fewer, "text" 14 words or fewer.
- comparison: two sides (before/after, option A/B, pros/cons). "left" and "right" each have a heading and 2-4 points.
- quote: a memorable sentence quoted in the document, with "by" naming who said it.
- statement: the single most important message, 25 words or fewer, in "text". Use at most twice.
Fill only the fields the chosen layout uses.

Do not add a title slide, agenda or closing slide; the app adds those.

Deck
- "title": the deck title, 10 words or fewer, faithful to the document's title. "subtitle": 14 words or fewer, or "".
- "template": the visual template that fits the subject. One of:
  business (business, finance, strategy), tech (technology, software, data), science (science, research),
  education (teaching, learning, schools), health (health, medicine, wellbeing), creative (marketing, brand, design, arts),
  nature (environment, climate, agriculture), legal (law, policy, government), general (anything else).
- "reason": one sentence on why that template fits.`;

function buildPrompt(doc: { title: string; subtitle: string; text: string }): string {
  return `${DESIGN_RULES}

Reply with JSON only.

<document>
Title: ${doc.title}
Subtitle: ${doc.subtitle}

${doc.text}
</document>`;
}

function cors(env: Env, origin: string | null): Record<string, string> {
  const allowed = origin && (origin === env.ALLOWED_ORIGIN || origin.startsWith("http://localhost:"));
  return {
    "Access-Control-Allow-Origin": allowed ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = cors(env, origin);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Use POST." }, 405, headers);
    if (origin && origin !== env.ALLOWED_ORIGIN && !origin.startsWith("http://localhost:")) {
      return json({ error: "This site is not allowed to use the designer." }, 403, headers);
    }

    let doc: { title: string; subtitle: string; text: string };
    try {
      const body = (await request.json()) as { doc?: Partial<typeof doc> };
      doc = {
        title: String(body.doc?.title ?? "").slice(0, 300),
        subtitle: String(body.doc?.subtitle ?? "").slice(0, 300),
        text: String(body.doc?.text ?? ""),
      };
    } catch {
      return json({ error: "The request body must be JSON." }, 400, headers);
    }
    if (!doc.text.trim()) return json({ error: "The document has no text." }, 400, headers);
    if (doc.text.length > MAX_DOC_CHARS) {
      return json({ error: `The document is too long for AI design (over ${MAX_DOC_CHARS.toLocaleString()} characters).` }, 413, headers);
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const response = await client.beta.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: betaZodOutputFormat(Deck) },
        messages: [{ role: "user", content: buildPrompt(doc) }],
      });
      if (response.stop_reason === "refusal") {
        return json({ error: "Claude declined to design this document." }, 422, headers);
      }
      if (response.stop_reason === "max_tokens" || !response.parsed_output) {
        return json({ error: "The design came back incomplete. Try again." }, 502, headers);
      }
      return json({ deck: response.parsed_output, model: response.model }, 200, headers);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: "The designer is busy. Try again in a minute." }, 429, headers);
      if (err instanceof Anthropic.AuthenticationError) return json({ error: "The designer's API key is missing or invalid." }, 500, headers);
      if (err instanceof Anthropic.APIError) return json({ error: `Claude returned an error (${err.status ?? "network"}).` }, 502, headers);
      return json({ error: "The designer failed unexpectedly." }, 500, headers);
    }
  },
};
