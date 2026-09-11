import { useEffect, useState } from "react";
import { Share, Plus, X, Download } from "lucide-react";

/**
 * Invites phone users to install SpeakBusy to their home screen.
 *
 * Deliberately restrained:
 * - never on desktop, never once already installed
 * - not on the very first visit, since asking a stranger to install is a bad trade;
 *   we wait until someone has come back, which signals actual interest
 * - shown once per session, not once ever: a prompt seen a single time is
 *   easy to dismiss reflexively and then never see again, and for a website
 *   with no notifications the home screen icon is the main way anyone comes
 *   back
 * - permanently dismissible, but only if the user explicitly asks for that
 *
 * Android/Chrome exposes `beforeinstallprompt`, so there we can offer a real
 * one-tap install. iOS Safari has no such API. Apple requires the user to go
 * through the Share menu, so there we can only show instructions.
 */

const NEVER_KEY = "speakbusy:a2hs-never";      // "აღარ მაჩვენო" was ticked
const SESSION_KEY = "speakbusy:a2hs-seen";     // shown already this session
const VISITS_KEY = "speakbusy:visits";
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

/** The user asked never to see this again. Permanent, and per device. */
function dismissedForever(): boolean {
  try {
    return localStorage.getItem(NEVER_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Already shown this session. sessionStorage, not localStorage, so it clears
 * when the tab closes: the prompt returns on the next visit but does not
 * reappear while the user moves between pages.
 */
function seenThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
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
  const [never, setNever] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    if (p === "other" || isStandalone() || dismissedForever() || seenThisSession()) return;
    const visits = bumpVisits();
    if (visits < MIN_VISITS) return;

    // Android: capture the install event so we can trigger it on tap.
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Let the page settle first. Appearing mid-render feels like an ad.
    const t = window.setTimeout(() => {
      setShow(true);
      // Marked when it is SHOWN, not when dismissed: otherwise navigating away
      // before dismissing would make it reappear on the next page.
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
    }, 2500);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(t);
    };
  }, []);

  /**
   * Closing hides it for this session. It only stops coming back if the user
   * explicitly asked for that, which is the whole point of the change: a
   * reflexive dismissal should not silently remove the prompt forever.
   */
  const dismiss = () => {
    if (never) {
      try { localStorage.setItem(NEVER_KEY, "1"); } catch { /* ignore */ }
    }
    setShow(false);
  };

  /** Installing means they never need the prompt again. */
  const dismissPermanently = () => {
    try { localStorage.setItem(NEVER_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  const install = async () => {
    if (!installEvent) return;
    installEvent.prompt();
    try { await installEvent.userChoice; } catch { /* ignore */ }
    setInstallEvent(null);
    dismissPermanently();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md rounded-2xl bg-card border border-line shadow-[0_8px_30px_-8px_rgba(28,28,30,0.35)] p-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-wine text-on-dark grid place-items-center shrink-0 font-bold text-sm">
            SB
          </span>
          <div className="flex-1 min-w-0">
            <p className="ka text-sm font-bold text-ink">
              დაამატე SpeakBusy მთავარ ეკრანზე
            </p>
            <p className="ka text-xs text-ink-muted mt-1 leading-relaxed">
              გაიხსნება აპივით, სწრაფად და ბრაუზერის ზოლის გარეშე.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="დახურვა"
            className="shrink-0 -mt-1 -mr-1 p-1.5 text-ink-subtle hover:text-ink"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </div>

        {platform === "ios" ? (
          <ol className="mt-3 space-y-2 border-t border-line pt-3">
            <li className="flex items-center gap-2 ka text-xs text-ink">
              <span className="w-5 h-5 rounded-full bg-cream grid place-items-center text-[10px] font-bold shrink-0">1</span>
              დააჭირე <Share size={13} strokeWidth={2.25} className="inline text-wine" /> ღილაკს ბრაუზერის ქვემოთ
            </li>
            <li className="flex items-center gap-2 ka text-xs text-ink">
              <span className="w-5 h-5 rounded-full bg-cream grid place-items-center text-[10px] font-bold shrink-0">2</span>
              აირჩიე <Plus size={13} strokeWidth={2.25} className="inline text-wine" /> „Add to Home Screen“
            </li>
            <li className="flex items-center gap-2 ka text-xs text-ink">
              <span className="w-5 h-5 rounded-full bg-cream grid place-items-center text-[10px] font-bold shrink-0">3</span>
              დაადასტურე „Add“
            </li>
          </ol>
        ) : installEvent ? (
          <button
            onClick={install}
            className="ka mt-3 w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-wine text-on-dark text-sm font-bold"
          >
            <Download size={15} strokeWidth={2.25} />
            დაამატე მთავარ ეკრანზე
          </button>
        ) : (
          <ol className="mt-3 space-y-2 border-t border-line pt-3">
            <li className="flex items-center gap-2 ka text-xs text-ink">
              <span className="w-5 h-5 rounded-full bg-cream grid place-items-center text-[10px] font-bold shrink-0">1</span>
              გახსენი ბრაუზერის მენიუ (⋮)
            </li>
            <li className="flex items-center gap-2 ka text-xs text-ink">
              <span className="w-5 h-5 rounded-full bg-cream grid place-items-center text-[10px] font-bold shrink-0">2</span>
              აირჩიე „Add to Home screen“
            </li>
          </ol>
        )}

        {/* Opt out permanently. Without this the prompt would return every
            session with no way to stop it, which is worse than showing it once. */}
        <label className="flex items-center gap-2 mt-3 pt-3 border-t border-line cursor-pointer">
          <input
            type="checkbox"
            checked={never}
            onChange={(e) => setNever(e.target.checked)}
            className="w-4 h-4 shrink-0 accent-wine cursor-pointer"
          />
          <span className="ka text-xs text-ink-muted">აღარ მაჩვენო</span>
        </label>
      </div>
    </div>
  );
}
