import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";

// Typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?mode=login&next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message);
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "ვერ ჩაიტვირთა");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauthApi.approveAuthorization(authorizationId)
        : await oauthApi.denyAuthorization(authorizationId);
      if (error) {
        setBusy(false);
        return setError(error.message);
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setBusy(false);
        return setError("No redirect returned by the authorization server.");
      }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "შეცდომა");
    }
  }

  return (
    <Layout showLogout={false}>
      <div className="max-w-md mx-auto py-10">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 ka">
            {error}
          </div>
        )}
        {!error && !details && (
          <div className="text-center text-[#4A4A4A] ka">იტვირთება…</div>
        )}
        {!error && details && (
          <div className="p-6 rounded-2xl bg-[#F5F4F2] border border-[#E4E2DF] space-y-5">
            <div>
              <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-[#1C1C1E]">
                Agent integration
              </div>
              <h1 className="text-2xl font-extrabold ka text-[#5C1A2E] mt-2 tracking-tight">
                დაუკავშირდი {details.client?.name ?? "აპლიკაციას"}
              </h1>
              <p className="text-sm text-[#4A4A4A] mt-2 ka leading-relaxed">
                {details.client?.name ?? "ეს აპლიკაცია"} მოითხოვს წვდომას SpeakBusy-ის შენს ანგარიშზე
                (პროფილი, ლექსიკონი, პროგრესი) შენი სახელით.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                disabled={busy}
                onClick={() => decide(true)}
                className="flex-1 h-11 rounded-xl bg-[#111111] text-[#F5F4F2] text-sm font-semibold ka hover:bg-[#161616] transition-colors disabled:opacity-60"
              >
                დაშვება
              </button>
              <button
                disabled={busy}
                onClick={() => decide(false)}
                className="flex-1 h-11 rounded-xl border border-[#3D1220]/30 text-sm font-semibold text-[#5C1A2E] ka hover:bg-[#111111]/5 transition-colors disabled:opacity-60"
              >
                უარყოფა
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
