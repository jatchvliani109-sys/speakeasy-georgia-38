// TEMPORARY: triggers daily-tasks with the CRON_SECRET header. Deleted after use.
Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== "run-now-9f2a") {
    return new Response(JSON.stringify({ error: "forbidden" }), { status: 403 });
  }
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/daily-tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
    },
    body: "{}",
  });
  const text = await res.text();
  return new Response(JSON.stringify({ status: res.status, body: text }), {
    headers: { "Content-Type": "application/json" },
  });
});
