import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import RequireAuth from "@/components/RequireAuth";
import DevNav from "@/components/DevNav";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import LearningPathSelection from "./pages/LearningPathSelection";
import SpeakingDashboard from "./pages/paths/speaking/SpeakingDashboard";
import SpeakingDailyLesson from "./pages/paths/speaking/DailyLesson";
import AISpeakingCall from "./pages/paths/speaking/AISpeakingCall";
import SpeakingPronunciation from "./pages/paths/speaking/Pronunciation";
import SpeakingRoleplayList from "./pages/paths/speaking/RoleplayList";
import SpeakingRoleplaySession from "./pages/paths/speaking/RoleplaySession";
import SpeakingProgress from "./pages/paths/speaking/SpeakingProgress";
import BusinessGate from "./pages/paths/business/BusinessGate";
import BusinessSetup from "./pages/paths/business/BusinessSetup";
import BusinessPlacementTest from "./pages/paths/business/BusinessPlacementTest";
import BusinessPlan from "./pages/paths/business/BusinessPlan";
import BusinessHome from "./pages/paths/business/BusinessHome";
import BusinessModule from "./pages/paths/business/BusinessModule";
import MyLexicon from "./pages/paths/business/MyLexicon";
import BusinessReassessment from "./pages/paths/business/BusinessReassessment";
import { Navigate } from "react-router-dom";
import SelfIntroduction from "./pages/paths/business/SelfIntroduction";
import BusinessResumeUpload from "./pages/paths/business/BusinessResumeUpload";
import DocumentHelper from "./pages/paths/business/DocumentHelper";
import NationalExamDashboard from "./pages/paths/NationalExam";
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
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/learning-path" element={<RequireAuth><LearningPathSelection /></RequireAuth>} />
            
            <Route path="/path/speaking" element={<RequireAuth><SpeakingDashboard /></RequireAuth>} />
            <Route path="/path/speaking/call" element={<RequireAuth><AISpeakingCall /></RequireAuth>} />
            <Route path="/path/speaking/daily" element={<RequireAuth><AISpeakingCall /></RequireAuth>} />
            <Route path="/path/speaking/daily-legacy" element={<RequireAuth><SpeakingDailyLesson /></RequireAuth>} />
            <Route path="/path/speaking/pronunciation" element={<RequireAuth><SpeakingPronunciation /></RequireAuth>} />
            <Route path="/path/speaking/roleplay" element={<RequireAuth><SpeakingRoleplayList /></RequireAuth>} />
            <Route path="/path/speaking/roleplay/:scenarioId" element={<RequireAuth><SpeakingRoleplaySession /></RequireAuth>} />
            <Route path="/path/speaking/progress" element={<RequireAuth><SpeakingProgress /></RequireAuth>} />
            
            <Route path="/path/business" element={<RequireAuth><BusinessGate /></RequireAuth>} />
            <Route path="/path/business/setup" element={<RequireAuth><BusinessSetup /></RequireAuth>} />
            <Route path="/path/business/test" element={<RequireAuth><BusinessPlacementTest /></RequireAuth>} />
            <Route path="/path/business/plan" element={<RequireAuth><BusinessPlan /></RequireAuth>} />
            <Route path="/path/business/home" element={<RequireAuth><BusinessHome /></RequireAuth>} />
            <Route path="/path/business/resume" element={<RequireAuth><BusinessResumeUpload /></RequireAuth>} />
            <Route path="/path/business/self-introduction" element={<RequireAuth><SelfIntroduction /></RequireAuth>} />
            <Route path="/path/business/module/:slug" element={<RequireAuth><BusinessModule /></RequireAuth>} />
            <Route path="/path/business/lexicon" element={<RequireAuth><MyLexicon /></RequireAuth>} />
            <Route path="/path/business/dictionary" element={<Navigate to="/path/business/lexicon?tab=phrases" replace />} />
            <Route path="/path/business/vocabulary/notebook" element={<Navigate to="/path/business/lexicon?tab=words" replace />} />
            <Route path="/path/business/documents" element={<RequireAuth><DocumentHelper /></RequireAuth>} />

            
            <Route path="/path/exam" element={<RequireAuth><NationalExamDashboard /></RequireAuth>} />
            <Route path="/lesson" element={<RequireAuth><Lesson /></RequireAuth>} />
            <Route path="/summary/:id" element={<RequireAuth><Summary /></RequireAuth>} />
            <Route path="/vocabulary" element={<RequireAuth><Vocabulary /></RequireAuth>} />
            <Route path="/mistakes" element={<RequireAuth><Mistakes /></RequireAuth>} />
            <Route path="/progress" element={<RequireAuth><ProgressPage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <DevNav />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
