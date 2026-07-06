import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_business_progress",
  title: "Get business English progress",
  description: "Read the signed-in user's business English learning state and recent vocab session stats.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const uid = ctx.getUserId();
    const [{ data: state }, { data: sessions }] = await Promise.all([
      client.from("business_state").select("state, updated_at").eq("user_id", uid).maybeSingle(),
      client
        .from("business_vocab_sessions")
        .select("id, total, new_words, review_words, score, completed, completed_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    const payload = { state: state ?? null, recent_vocab_sessions: sessions ?? [] };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
