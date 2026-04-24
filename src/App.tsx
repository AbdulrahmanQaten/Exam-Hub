import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/ThemeProvider";
import { AppHeader } from "@/components/AppHeader";
import Index from "./pages/Index";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateQuiz from "./pages/CreateQuiz";
import StudentEntry from "./pages/StudentEntry";
import TakeQuiz from "./pages/TakeQuiz";
import QuizComplete from "./pages/QuizComplete";
import QuizResults from "./pages/QuizResults";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import HowItWorks from "./pages/HowItWorks";
import { AuthProvider } from "./hooks/useAuth";
import BankDashboard from "./pages/BankDashboard";
import BankDetails from "./pages/BankDetails";
import ClassManagement from "./pages/ClassManagement";
import ClassDetails from "./pages/ClassDetails";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { MobileBottomNav } from "./components/MobileBottomNav";

const queryClient = new QueryClient();

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
                  <Route path="*" element={<NotFound />} />
                </Routes>
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
