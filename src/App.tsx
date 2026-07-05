import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import BusinessModulesList from "./pages/paths/business/BusinessModulesList";

import BusinessGate from "./pages/paths/business/BusinessGate";
import BusinessSetup from "./pages/paths/business/BusinessSetup";
import BusinessPlacementTest from "./pages/paths/business/BusinessPlacementTest";
import BusinessPlan from "./pages/paths/business/BusinessPlan";
import BusinessHome from "./pages/paths/business/BusinessHome";
import BusinessModule from "./pages/paths/business/BusinessModule";
import MyLexicon from "./pages/paths/business/MyLexicon";
import BusinessReassessment from "./pages/paths/business/BusinessReassessment";
import SelfIntroduction from "./pages/paths/business/SelfIntroduction";
import BusinessResumeUpload from "./pages/paths/business/BusinessResumeUpload";
import DocumentHelper from "./pages/paths/business/DocumentHelper";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";

import Lesson from "./pages/Lesson";
import Summary from "./pages/Summary";
import Vocabulary from "./pages/Vocabulary";
import Mistakes from "./pages/Mistakes";
import ProgressPage from "./pages/Progress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfUse />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/path/business/modules" element={<RequireAuth><BusinessModulesList /></RequireAuth>} />
            
            
            
            <Route path="/path/business" element={<RequireAuth><BusinessGate /></RequireAuth>} />
            <Route path="/path/business/setup" element={<RequireAuth><BusinessSetup /></RequireAuth>} />
            <Route path="/path/business/test" element={<RequireAuth><BusinessPlacementTest /></RequireAuth>} />
            <Route path="/path/business/plan" element={<RequireAuth><BusinessPlan /></RequireAuth>} />
            <Route path="/path/business/home" element={<RequireAuth><BusinessHome /></RequireAuth>} />
            <Route path="/path/business/resume" element={<RequireAuth><BusinessResumeUpload /></RequireAuth>} />
            <Route path="/path/business/self-introduction" element={<RequireAuth><SelfIntroduction /></RequireAuth>} />
            <Route path="/path/business/module/:slug" element={<RequireAuth><BusinessModule /></RequireAuth>} />
            <Route path="/path/business/lexicon" element={<RequireAuth><MyLexicon /></RequireAuth>} />
            <Route path="/path/business/reassessment" element={<RequireAuth><BusinessReassessment /></RequireAuth>} />
            <Route path="/path/business/dictionary" element={<Navigate to="/path/business/lexicon?tab=phrases" replace />} />
            <Route path="/path/business/vocabulary/notebook" element={<Navigate to="/path/business/lexicon?tab=words" replace />} />
            <Route path="/path/business/documents" element={<RequireAuth><DocumentHelper /></RequireAuth>} />

            
            <Route path="/lesson" element={<RequireAuth><Lesson /></RequireAuth>} />
            <Route path="/summary/:id" element={<RequireAuth><Summary /></RequireAuth>} />
            <Route path="/vocabulary" element={<RequireAuth><Vocabulary /></RequireAuth>} />
            <Route path="/mistakes" element={<RequireAuth><Mistakes /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
