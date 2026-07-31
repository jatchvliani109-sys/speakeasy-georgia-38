import { useEffect, useState } from "react";
import { Share, Plus, X, Download } from "lucide-react";

/**
 * Invites phone users to install SpeakBusy to their home screen.
 *
 * Deliberately restrained:
 * - never on desktop, never once already installed
 * - not on the very first visit — asking a stranger to install is a bad trade;
 *   we wait until someone has come back, which signals actual interest
 * - dismissible, and the dismissal is remembered for 60 days
 *
 * Android/Chrome exposes `beforeinstallprompt`, so there we can offer a real
 * one-tap install. iOS Safari has no such API — Apple requires the user to go
 * through the Share menu — so there we can only show instructions.
 */

const DISMISS_KEY = "speakbusy:a2hs-dismissed-at";
const VISITS_KEY = "speakbusy:visits";
const DISMISS_DAYS = 60;
const MIN_VISITS = 2;

type Platform = "ios" | "android" | "other";

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  // iPadOS 13+ reports as Mac but has touch
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "other";
}

function isStandalone(): boolean {
  // Chrome/Android + spec
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari's non-standard flag
  return (navigator as unknown as { standalone?: boolean }).standalone === true;
}

function dismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const days = (Date.now() - Number(raw)) / 86_400_000;
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function bumpVisits(): number {
  try {
    const n = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export default function AddToHomeScreen() {
  const [show, setShow] = useState(false);
  const [platform, setPlatform] = useState<Platform>("other");
  const [installEvent, setInstallEvent] = useState<any>(null);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    if (p === "other" || isStandalone() || dismissedRecently()) return;
    const visits = bumpVisits();
    if (visits < MIN_VISITS) return;

    // Android: capture the install event so we can trigger it on tap.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Let the page settle first — appearing mid-render feels like an ad.
    const t = window.setTimeout(() => setShow(true), 2500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch { /* ignore */ }
    setInstallEvent(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md rounded-2xl bg-white border border-[#E4E2DF] shadow-[0_8px_30px_-8px_rgba(28,28,30,0.35)] p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#5C1A2E] text-[#F8F5F0] grid place-items-center shrink-0 font-bold text-sm">
            SB
          </span>
          <div className="flex-1 min-w-0">
            <p className="ka text-sm font-bold text-[#1C1C1E]">
              დაამატე SpeakBusy მთავარ ეკრანზე
            </p>
            <p className="ka text-xs text-[#4A4A4A] mt-1 leading-relaxed">
              გაიხსნება აპივით — სწრაფად, ბრაუზერის ზოლის გარეშე.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="დახურვა"
            className="shrink-0 -mt-1 -mr-1 p-1.5 text-[#8A8A8A] hover:text-[#1C1C1E]"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {platform === "ios" ? (
          <ol className="mt-3 space-y-2 border-t border-[#E4E2DF] pt-3">
            <li className="flex items-center gap-2 ka text-xs text-[#1C1C1E]">
              <span className="w-5 h-5 rounded-full bg-[#F5F4F2] grid place-items-center text-[10px] font-bold shrink-0">1</span>
              დააჭირე <Share size={13} strokeWidth={2.25} className="inline text-[#5C1A2E]" /> ღილაკს ბრაუზერის ქვემოთ
            </li>
            <li className="flex items-center gap-2 ka text-xs text-[#1C1C1E]">
              <span className="w-5 h-5 rounded-full bg-[#F5F4F2] grid place-items-center text-[10px] font-bold shrink-0">2</span>
              აირჩიე <Plus size={13} strokeWidth={2.25} className="inline text-[#5C1A2E]" /> „Add to Home Screen“
            </li>
            <li className="flex items-center gap-2 ka text-xs text-[#1C1C1E]">
              <span className="w-5 h-5 rounded-full bg-[#F5F4F2] grid place-items-center text-[10px] font-bold shrink-0">3</span>
              დაადასტურე „Add“
            </li>
          </ol>
        ) : installEvent ? (
          <button
            onClick={install}
            className="ka mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-[#5C1A2E] text-[#F8F5F0] text-sm font-bold"
          >
            <Download size={15} strokeWidth={2.25} />
            დაამატე მთავარ ეკრანზე
          </button>
        ) : (
          <ol className="mt-3 space-y-2 border-t border-[#E4E2DF] pt-3">
            <li className="flex items-center gap-2 ka text-xs text-[#1C1C1E]">
              <span className="w-5 h-5 rounded-full bg-[#F5F4F2] grid place-items-center text-[10px] font-bold shrink-0">1</span>
              გახსენი ბრაუზერის მენიუ (⋮)
            </li>
            <li className="flex items-center gap-2 ka text-xs text-[#1C1C1E]">
              <span className="w-5 h-5 rounded-full bg-[#F5F4F2] grid place-items-center text-[10px] font-bold shrink-0">2</span>
              აირჩიე „Add to Home screen“
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
