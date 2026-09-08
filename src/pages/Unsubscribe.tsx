import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

type State = "loading" | "valid" | "invalid" | "used" | "done" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`;
    fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string } })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) return setState("invalid");
        if (data?.already_unsubscribed || data?.used) return setState("used");
        setState("valid");
      })
      .catch(() => setState("error"));
  }, [token]);

  const confirm = async () => {
    setBusy(true);
    const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
    setBusy(false);
    setState(error ? "error" : "done");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEO title="გამოწერის გაუქმება — SpeakBusy" description="შეწყვიტე SpeakBusy-ის შეტყობინებების მიღება." path="/unsubscribe" />
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
        <h1 className="text-xl font-bold text-foreground mb-4">შეტყობინებების გაუქმება</h1>

        {state === "loading" && <p className="text-muted-foreground">იტვირთება…</p>}

        {state === "valid" && (
          <>
            <p className="text-muted-foreground mb-6">
              დაადასტურე, თუ აღარ გსურს SpeakBusy-ისგან წერილების მიღება.
            </p>
            <Button onClick={confirm} disabled={busy} className="w-full">
              {busy ? "მუშავდება…" : "დადასტურება"}
            </Button>
          </>
        )}

        {state === "done" && <p className="text-muted-foreground">მზადაა — წერილებს აღარ მიიღებ.</p>}
        {state === "used" && <p className="text-muted-foreground">ეს მისამართი უკვე გაუქმებულია.</p>}
        {state === "invalid" && <p className="text-muted-foreground">ბმული არასწორია ან ვადაგასულია.</p>}
        {state === "error" && <p className="text-muted-foreground">დაფიქსირდა შეცდომა. სცადე მოგვიანებით.</p>}
      </div>
    </main>
  );
}
