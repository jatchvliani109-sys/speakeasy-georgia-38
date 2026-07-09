// ONE-TIME audio generator for SpeakBusy scenario DIALOGUES.
// Generates an MP3 for every dialogue line in vocabContext.ts via OpenAI TTS
// and stores it in the same "word-audio" bucket the word MP3s live in, under
// keys dlg-<scenario-id>-<line> — exactly what ReadAloudButton requests from
// the Scenarios page. Speakers within a scenario get different voices so the
// dialogue sounds like a real conversation.
//
// Open the function URL in a browser with ?token=speakbusy-dialogue-2026 —
// the page auto-refreshes and processes a batch per refresh until done.
// Safe to re-run anytime (skips files that already exist).
// DELETE THIS FUNCTION AFTERWARDS.

const ADMIN_TOKEN = "speakbusy-dialogue-2026";
const BUCKET = "word-audio";
const BATCH_SIZE = 20;

// [storageKey, textToSpeak, voice] — generated + verified from vocabContext.ts (54 lines)
const LINES: [string, string, string][] = [
  ["dlg-running-a-meeting-0", "Good morning everyone — let's get started. We have three agenda items today.", "nova"],
  ["dlg-running-a-meeting-1", "I can take the minutes today.", "onyx"],
  ["dlg-running-a-meeting-2", "Thanks, Giorgi. First item: the budget.", "nova"],
  ["dlg-running-a-meeting-3", "Can we postpone the last item? We need more data.", "shimmer"],
  ["dlg-running-a-meeting-4", "Good idea — let's move it to next week. Now, action items.", "nova"],
  ["dlg-running-a-meeting-5", "I'll send a recap with the next steps after the meeting.", "onyx"],
  ["dlg-status-update-0", "Quick status update — where are we on the project?", "nova"],
  ["dlg-status-update-1", "Good progress this week. We hit the first milestone on schedule.", "onyx"],
  ["dlg-status-update-2", "Any blockers?", "nova"],
  ["dlg-status-update-3", "One — the vendor's API is delayed, so that part is still pending.", "onyx"],
  ["dlg-status-update-4", "Understood. What's your top priority now?", "nova"],
  ["dlg-status-update-5", "The overdue task from last week — I'll close it today.", "onyx"],
  ["dlg-emails-and-messaging-0", "Did the client reply to our proposal?", "nova"],
  ["dlg-emails-and-messaging-1", "Not yet. I'm writing a short follow-up now.", "onyx"],
  ["dlg-emails-and-messaging-2", "Keep the subject line clear — and attach the updated file.", "nova"],
  ["dlg-emails-and-messaging-3", "Done. Should I add the manager in CC?", "onyx"],
  ["dlg-emails-and-messaging-4", "Yes. And save it as a draft first — read it once more before sending.", "nova"],
  ["dlg-emails-and-messaging-5", "Good call. Sending it now — I'll forward you a copy.", "onyx"],
  ["dlg-deadlines-and-scheduling-0", "The client wants to reschedule Friday's review.", "nova"],
  ["dlg-deadlines-and-scheduling-1", "The deadline can't move, though.", "onyx"],
  ["dlg-deadlines-and-scheduling-2", "I know. What's your availability Thursday morning?", "nova"],
  ["dlg-deadlines-and-scheduling-3", "I'm free before noon. Mark it urgent so everyone confirms.", "onyx"],
  ["dlg-deadlines-and-scheduling-4", "Will do — I'll ask everyone to respond by EOD.", "nova"],
  ["dlg-deadlines-and-scheduling-5", "And add a small buffer before the final review, just in case.", "onyx"],
  ["dlg-negotiation-0", "We like the proposal, but the price is too high.", "nova"],
  ["dlg-negotiation-1", "We can negotiate. What terms would work for you?", "onyx"],
  ["dlg-negotiation-2", "Here's our counteroffer — ten percent less, faster delivery.", "nova"],
  ["dlg-negotiation-3", "We can make a concession on price if you're flexible on the delivery date.", "onyx"],
  ["dlg-negotiation-4", "That sounds like a fair compromise.", "nova"],
  ["dlg-negotiation-5", "Great — a real win-win. Let's close the deal.", "onyx"],
  ["dlg-feedback-and-reviews-0", "Let's start your performance review. First, your strengths.", "nova"],
  ["dlg-feedback-and-reviews-1", "Thank you. I'd also like honest feedback on what to improve.", "onyx"],
  ["dlg-feedback-and-reviews-2", "Your client communication is excellent. One weakness: you ask for feedback too late.", "nova"],
  ["dlg-feedback-and-reviews-3", "That's fair — and constructive. How can I fix it?", "onyx"],
  ["dlg-feedback-and-reviews-4", "Send your drafts for peer review earlier. Let's check progress in our next one-on-one.", "nova"],
  ["dlg-feedback-and-reviews-5", "Deal. I'll highlight the changes in my next report.", "onyx"],
  ["dlg-requesting-by-email-0", "Dear team, I'm writing to request last quarter's sales numbers.", "nova"],
  ["dlg-requesting-by-email-1", "Could you also clarify the March figures? Please send the report as an attachment.", "nova"],
  ["dlg-requesting-by-email-2", "Of course — we'll respond with the full file by tomorrow.", "onyx"],
  ["dlg-requesting-by-email-3", "We apologize for the delay with the March data.", "onyx"],
  ["dlg-requesting-by-email-4", "No problem. Please submit the final version by Friday.", "nova"],
  ["dlg-requesting-by-email-5", "Will do. Sending it in a formal template with my signature.", "onyx"],
  ["dlg-job-interview-0", "Thanks for coming in. Why did you apply for this position?", "nova"],
  ["dlg-job-interview-1", "It matches my experience — five years leading product teams.", "onyx"],
  ["dlg-job-interview-2", "What makes you a strong candidate?", "nova"],
  ["dlg-job-interview-3", "I deliver on time — my references can confirm that.", "onyx"],
  ["dlg-job-interview-4", "What are your salary expectations?", "nova"],
  ["dlg-job-interview-5", "I'd like to hear the range for the role — I'm flexible for the right team.", "onyx"],
  ["dlg-giving-a-presentation-0", "Before I start the presentation — can everyone see the first slide?", "nova"],
  ["dlg-giving-a-presentation-1", "Yes, all good.", "onyx"],
  ["dlg-giving-a-presentation-2", "Great. The main takeaway today: revenue is up twelve percent.", "nova"],
  ["dlg-giving-a-presentation-3", "Nice opening — the audience loves numbers first.", "onyx"],
  ["dlg-giving-a-presentation-4", "I'll present the details region by region, then take questions.", "nova"],
  ["dlg-giving-a-presentation-5", "Perfect. End with the summary slide — people remember the last thing they see.", "onyx"],
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_KEY") ??
  "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

function storageHeaders(extra: Record<string, string> = {}) {
  return { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, ...extra };
}

async function ensureBucket() {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${BUCKET}`, {
    headers: storageHeaders(),
  });
  if (res.ok) return;
  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!create.ok) {
    throw new Error(`bucket create ${create.status}: ${(await create.text()).slice(0, 300)}`);
  }
}

async function listExisting(): Promise<Set<string>> {
  const existing = new Set<string>();
  let offset = 0;
  while (true) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: storageHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ prefix: "dlg-", limit: 1000, offset }),
    });
    if (!res.ok) break;
    const rows = (await res.json()) as { name: string }[];
    rows.forEach((r) => existing.add(r.name));
    if (rows.length < 1000) break;
    offset += 1000;
  }
  return existing;
}

async function tts(text: string, voice: string): Promise<ArrayBuffer> {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini-tts", input: text, voice, response_format: "mp3" }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return await res.arrayBuffer();
}

async function upload(name: string, audio: ArrayBuffer) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${name}`, {
    method: "POST",
    headers: storageHeaders({ "Content-Type": "audio/mpeg", "x-upsert": "true" }),
    body: audio,
  });
  if (!res.ok) throw new Error(`upload ${name} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function page(body: string, refresh: boolean) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8">` +
      (refresh ? `<meta http-equiv="refresh" content="2">` : "") +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<style>body{font-family:-apple-system,sans-serif;background:#1C1C1E;color:#F8F5F0;padding:24px;text-align:center}` +
      `.bar{background:#3a3a3c;border-radius:8px;height:14px;overflow:hidden;margin:16px 0}` +
      `.fill{background:#C9A84C;height:100%;transition:width .3s}` +
      `h1{color:#C9A84C;font-size:20px} .err{color:#ff6b6b;font-size:13px;text-align:left;white-space:pre-wrap}</style>` +
      `</head><body>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (url.searchParams.get("token") !== ADMIN_TOKEN) {
    return new Response("forbidden", { status: 403 });
  }
  if (!SERVICE_KEY || !SUPABASE_URL || !OPENAI_API_KEY) {
    const names = Object.keys(Deno.env.toObject())
      .filter((k) => k.includes("SUPA") || k.includes("KEY") || k.includes("URL"))
      .sort()
      .join("\n");
    return page(
      `<h1>⚠️ Missing configuration</h1>` +
        `<div class="err">SUPABASE_URL set: ${!!SUPABASE_URL}\nSERVICE key set: ${!!SERVICE_KEY}\nOPENAI key set: ${!!OPENAI_API_KEY}\n\nAvailable env variable NAMES (values hidden):\n${names}</div>`,
      false,
    );
  }
  try {
    await ensureBucket();
    const existing = await listExisting();
    const missing = LINES.filter(([key]) => !existing.has(`${key}.mp3`));
    const total = LINES.length;
    const doneBefore = total - missing.length;

    if (missing.length === 0) {
      return page(`<h1>✅ Done!</h1><p>All ${total} dialogue audios are generated and stored.</p>` +
        `<p>You can now DELETE this function from the repo.</p>`, false);
    }

    const batch = missing.slice(0, BATCH_SIZE);
    const errors: string[] = [];
    for (const [key, text, voice] of batch) {
      try {
        const audio = await tts(text, voice);
        await upload(`${key}.mp3`, audio);
      } catch (e) {
        errors.push(`${key}: ${(e as Error).message}`);
      }
    }

    const doneNow = doneBefore + batch.length - errors.length;
    const pct = Math.round((doneNow / total) * 100);
    return page(
      `<h1>🎙 Generating dialogue audio…</h1>` +
        `<div class="bar"><div class="fill" style="width:${pct}%"></div></div>` +
        `<p><b>${doneNow} / ${total}</b> (${pct}%) — page refreshes automatically, keep it open.</p>` +
        (errors.length ? `<div class="err">Errors this batch:\n${errors.join("\n")}</div>` : ""),
      true,
    );
  } catch (e) {
    return page(`<h1>⚠️ Error</h1><div class="err">${(e as Error).message}</div>` +
      `<p>Refresh to retry.</p>`, false);
  }
});