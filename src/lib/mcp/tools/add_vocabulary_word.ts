import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "add_vocabulary_word",
  title: "Add vocabulary word",
  description: "Add a new English word with a Georgian meaning to the signed-in user's vocabulary notebook.",
  inputSchema: {
    english_word: z.string().trim().min(1).describe("The English word or phrase to save."),
    georgian_meaning: z.string().trim().min(1).describe("Georgian translation / meaning."),
    example_sentence: z.string().trim().optional().describe("Optional example sentence in English."),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ english_word, georgian_meaning, example_sentence, difficulty }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("vocabulary")
      .insert({
        user_id: ctx.getUserId(),
        english_word,
        georgian_meaning,
        example_sentence: example_sentence ?? null,
        difficulty: difficulty ?? null,
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Saved: ${english_word}` }], structuredContent: { word: data } };
  },
});
