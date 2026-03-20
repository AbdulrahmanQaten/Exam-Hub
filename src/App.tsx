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

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppHeader />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/create" element={<CreateQuiz />} />
            <Route path="/teacher/edit/:quizId" element={<CreateQuiz />} />
            <Route path="/teacher/results/:quizId" element={<QuizResults />} />
            <Route path="/quiz/:code" element={<StudentEntry />} />
            <Route path="/quiz/:code/start" element={<TakeQuiz />} />
            <Route path="/quiz/:code/complete" element={<QuizComplete />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
