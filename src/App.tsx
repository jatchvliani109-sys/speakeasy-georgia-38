appimport { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import AddToHomeScreen from "@/components/AddToHomeScreen";

// ---------------------------------------------------------------------------
// EAGER: public pages — the first paint for a new visitor, so they must not
// wait on a chunk download.
// ---------------------------------------------------------------------------
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthConsent from "./pages/OAuthConsent";
import NotFound from "./pages/NotFound";

// ---------------------------------------------------------------------------
// LAZY: everything behind auth.
//
// BusinessHome imports vocabEngine, which imports vocabBank — 700 KB of source,
// ~144 KB gzipped. Importing these statically meant EVERY visitor downloaded the
// whole vocabulary before the landing page could render, even if they never
// signed in. Split this way, the bank is fetched only when a signed-in user
// opens a screen that actually needs it.
// ---------------------------------------------------------------------------
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const BusinessModulesList = lazy(() => import("./pages/paths/business/BusinessModulesList"));
const BusinessGate = lazy(() => import("./pages/paths/business/BusinessGate"));
const BusinessSetup = lazy(() => import("./pages/paths/business/BusinessSetup"));
const BusinessPlacementTest = lazy(() => import("./pages/paths/business/BusinessPlacementTest"));
const BusinessPlan = lazy(() => import("./pages/paths/business/BusinessPlan"));
const BusinessHome = lazy(() => import("./pages/paths/business/BusinessHome"));
const TrialGift = lazy(() => import("./pages/paths/business/TrialGift"));
const TrialEnded = lazy(() => import("./pages/paths/business/TrialEnded"));
const BusinessModule = lazy(() => import("./pages/paths/business/BusinessModule"));
const MyLexicon = lazy(() => import("./pages/paths/business/MyLexicon"));
const BusinessReassessment = lazy(() => import("./pages/paths/business/BusinessReassessment"));
const SelfIntroduction = lazy(() => import("./pages/paths/business/SelfIntroduction"));
const BusinessResumeUpload = lazy(() => import("./pages/paths/business/BusinessResumeUpload"));
const DocumentHelper = lazy(() => import("./pages/paths/business/DocumentHelper"));
const Scenarios = lazy(() => import("./pages/paths/business/Scenarios"));
const BusinessPremium = lazy(() => import("./pages/paths/business/BusinessPremium"));
const VocabularyModule = lazy(() => import("./pages/paths/business/VocabularyModule"));

const queryClient = new QueryClient();

/** Shown briefly while a route chunk downloads. */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-[#F8F5F0] grid place-items-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#E4E2DF] border-t-[#5C1A2E] animate-spin" />
        <p className="ka text-sm text-[#4A4A4A]">იტვირთება...</p>
      </div>
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/path/business/modules" element={<RequireAuth><BusinessModulesList /></RequireAuth>} />
            
            
            
            <Route path="/path/business" element={<RequireAuth><BusinessGate /></RequireAuth>} />
            <Route path="/path/business/setup" element={<RequireAuth><BusinessSetup /></RequireAuth>} />
            <Route path="/path/business/test" element={<RequireAuth><BusinessPlacementTest /></RequireAuth>} />
            <Route path="/path/business/plan" element={<RequireAuth><BusinessPlan /></RequireAuth>} />
            <Route path="/path/business/home" element={<RequireAuth><BusinessHome /></RequireAuth>} />
            <Route path="/path/business/gift" element={<RequireAuth><TrialGift /></RequireAuth>} />
            <Route path="/path/business/trial-ended" element={<RequireAuth><TrialEnded /></RequireAuth>} />
            <Route path="/path/business/resume" element={<RequireAuth><BusinessResumeUpload /></RequireAuth>} />
            <Route path="/path/business/self-introduction" element={<RequireAuth><SelfIntroduction /></RequireAuth>} />
            <Route path="/path/business/module/:slug" element={<RequireAuth><BusinessModule /></RequireAuth>} />
            <Route path="/path/business/lexicon" element={<RequireAuth><MyLexicon /></RequireAuth>} />
            <Route path="/path/business/reassessment" element={<RequireAuth><BusinessReassessment /></RequireAuth>} />
            <Route path="/path/business/dictionary" element={<Navigate to="/path/business/lexicon?tab=phrases" replace />} />
            <Route path="/path/business/vocabulary/notebook" element={<Navigate to="/path/business/lexicon?tab=words" replace />} />
            <Route path="/path/business/documents" element={<RequireAuth><DocumentHelper /></RequireAuth>} />
            <Route path="/path/business/scenarios" element={<RequireAuth><Scenarios /></RequireAuth>} />
            <Route path="/path/business/premium" element={<RequireAuth><BusinessPremium /></RequireAuth>} />
            <Route path="/path/business/vocabulary" element={<RequireAuth><VocabularyModule /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <AddToHomeScreen />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
