import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Home } from "@/pages/Home";
import { Summarizer } from "@/pages/Summarizer";
import { QuizGenerator } from "@/pages/QuizGenerator";
import { AnswerImprover } from "@/pages/AnswerImprover";
import { ConceptExplainer } from "@/pages/ConceptExplainer";
import { StudySet } from "@/pages/StudySet";
import { StudySetList } from "@/pages/StudySetList";
import { Help } from "@/pages/Help";
import { PrivacyPolicy } from "@/pages/PrivacyPolicy";
import { Terms } from "@/pages/Terms";
import { NotFound } from "@/pages/NotFound";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="summarizer" element={<Summarizer />} />
          <Route path="quiz" element={<QuizGenerator />} />
          <Route path="answer-improver" element={<AnswerImprover />} />
          <Route path="improver" element={<AnswerImprover />} />
          <Route path="concept-explainer" element={<ConceptExplainer />} />
          <Route path="study-set" element={<StudySetList />} />
          <Route path="study-sets" element={<StudySetList />} />
          <Route path="study-set/workspace" element={<StudySet />} />
          <Route path="study-set/:id" element={<StudySet />} />
          <Route path="help" element={<Help />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

