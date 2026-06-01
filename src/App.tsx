import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MobileBottomNav } from "./components/MobileBottomNav";

// Critical pages — loaded eagerly (small & needed on first visit)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentEntry from "./pages/StudentEntry";
import NotFound from "./pages/NotFound";

// Heavy pages — lazy loaded (code split into separate chunks)
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const CreateQuiz = lazy(() => import("./pages/CreateQuiz"));
const TakeQuiz = lazy(() => import("./pages/TakeQuiz"));
const QuizComplete = lazy(() => import("./pages/QuizComplete"));
const QuizResults = lazy(() => import("./pages/QuizResults"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const BankDashboard = lazy(() => import("./pages/BankDashboard"));
const BankDetails = lazy(() => import("./pages/BankDetails"));
const ClassManagement = lazy(() => import("./pages/ClassManagement"));
const ClassDetails = lazy(() => import("./pages/ClassDetails"));
const PrintQuiz = lazy(() => import("./pages/PrintQuiz"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="flex min-h-screen flex-col pb-16 md:pb-0">
              <AppHeader />
              <main className="flex-1">
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/how-it-works" element={<HowItWorks />} />
                    
                    {/* Public Teacher Routes (No Account Required) */}
                    <Route path="/teacher" element={<TeacherDashboard />} />
                    <Route path="/teacher/create" element={<CreateQuiz />} />
                    <Route path="/teacher/edit/:quizId" element={<CreateQuiz />} />
                    <Route path="/teacher/results/:quizId" element={<QuizResults />} />
                    
                    {/* Protected Features (Account Required) */}
                    <Route path="/banks" element={<ProtectedRoute><BankDashboard /></ProtectedRoute>} />
                    <Route path="/banks/:bankId" element={<ProtectedRoute><BankDetails /></ProtectedRoute>} />
                    <Route path="/classes" element={<ProtectedRoute><ClassManagement /></ProtectedRoute>} />
                    <Route path="/classes/:classId" element={<ProtectedRoute><ClassDetails /></ProtectedRoute>} />
                    
                    {/* Public Student Routes */}
                    <Route path="/quiz/:code" element={<StudentEntry />} />
                    <Route path="/quiz/:code/start" element={<TakeQuiz />} />
                    <Route path="/quiz/:code/complete" element={<QuizComplete />} />
                    <Route path="/print/:quizId" element={<PrintQuiz />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </main>
              <MobileBottomNav />
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
