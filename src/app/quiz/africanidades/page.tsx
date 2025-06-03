"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/use-user";
import { Loader2, ChevronLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { motion, AnimatePresence } from "framer-motion";

// Tipos
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_option: number;
  category: string | null;
}

export default function QuizPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, profile, isLoading } = useUser();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Carrega perguntas do quiz
  useEffect(() => {
    if (!user || !profile || isLoading) return;

    const fetchQuestions = async () => {
      setFetching(true);
      try {
        console.log("Fetching quiz questions");
        const { data, error } = await supabase
          .from("quiz_africanidades")
          .select("id, question, options, correct_option, category")
          .order("created_at", { ascending: true });

        if (error) {
          console.log("Fetch questions error:", error);
          throw error;
        }

        setQuestions(data);
        console.log("Questions loaded:", data);
      } catch (error: any) {
        console.log("Error fetching questions:", error.message, error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar o quiz.",
          variant: "destructive",
        });
      } finally {
        setFetching(false);
      }
    };

    fetchQuestions();
  }, [user, profile, isLoading, toast]);

  // Lidar com submissão da resposta
  const handleSubmit = async () => {
    if (!user || !profile || selectedOption === null) return;

    setSubmitting(true);
    try {
      console.log("Submitting answer for question:", questions[currentIndex].id);
      const selectedIndex = parseInt(selectedOption);

      // Get user session to obtain auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Usuário não autenticado.");
      }
      // Call the backend Edge Function
      const backendResponse = await fetch('/api/process-quiz-answer', { // Use the API route or direct Edge Function URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: questions[currentIndex].id,
 selected_option: selectedIndex,
        }),
      });

      if (!backendResponse.ok) {
          // Handle HTTP errors
          const errorBody = await backendResponse.text(); // or .json() if backend sends JSON error
          console.error("Backend error:", backendResponse.status, errorBody);
          throw new Error(`Backend error: ${backendResponse.statusText}`);
      }

      // Process response and advance question *after* a successful backend call
      const result = await backendResponse.json();

      // Use the 'isCorrect' property from the backend response for the toast message
      toast({
        title: result.isCorrect ? "Correto!" : (result.message || "Errado"), // Use backend message if available, otherwise default
        description: result.message || (result.isCorrect ? "Boa! Você acertou a pergunta." : "Resposta incorreta."), // Use backend message if available
        variant: result.isCorrect ? "default" : "destructive",
      });

    } catch (error: any) { // This catch block now handles fetch errors or errors thrown above
      console.log("Error submitting answer:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar a resposta: ${error.message}`,
        variant: "destructive",
      });
      // We still want to advance the question even on submit error to prevent being stuck
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
      } else {
        // If it's the last question, mark as completed even on error
        setCompleted(true);
      }
    } finally { // This finally block runs after try or catch, and after async operations within them
         // Always advance or complete the quiz after an attempt to submit, regardless of error (within fetch)
        if (currentIndex + 1 < questions.length) {
            setCurrentIndex(currentIndex + 1);
            setSelectedOption(null);
        } else {
            setCompleted(true);
        }
      }
  /*   finally {

      setSubmitting(false);
    }*/
  };

  // Handle the actual API call and state updates after backend response
  // This function is called after handleSubmit makes the fetch request
  // Removed the original handleSubmit logic and moved the core part here
  // Note: This separation is one way to handle it. You could also put
  // the `fetch` call and response handling directly in handleSubmit.
  // The previous diff attempt had issues, rewriting the core logic here.
  const handlePostSubmit = async () => {
      // This function is no longer directly called.
      // The logic is now integrated into the `try...finally` of `handleSubmit`.
      // Leaving this here as a placeholder or a note about the previous refactoring idea.
  };

  // Mapear categoria para interesse
  const mapCategoryToInterest = (category: string): string => {
    switch (category.toLowerCase()) {
      case "history":
        return "História Africana";
      case "music":
        return "Música Afro-Brasileira";
      case "culture":
        return "Cultura Afro";
      default:
        return "Africanidades";
    }
  };

  if (isLoading || fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    router.push("/login");
    return null;
  }

  if (completed) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/discover")}>
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <Logo size="sm" />
          <div className="w-10"></div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto w-full"
        >
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Quiz Concluído!</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-gray-500 text-center mb-4">
                Parabéns por completar o Quiz de Africanidades! Suas respostas foram registradas e seus interesses foram atualizados para melhorar suas conexões.
              </p>
              <Button
                onClick={() => router.push("/discover")}
                className="gradient-button"
              >
                Voltar para Descobrir Perfis
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/discover")}>
            <ChevronLeft className="h-6 w-6 text-gray-700" />
          </Button>
          <Logo size="sm" />
          <div className="w-10"></div>
        </div>
        <Card className="max-w-md mx-auto w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 text-center">Nenhuma pergunta disponível no momento.</p>
            <Button
              onClick={() => router.push("/discover")}
              className="mt-4 gradient-button"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/discover")}>
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </Button>
        <Logo size="sm" />
        <div className="w-10"></div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md mx-auto w-full"
      >
        <h2 className="text-2xl font-bold gradient-text text-center mb-6">
          Quiz de Africanidades ({currentIndex + 1}/{questions.length})
        </h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{questions[currentIndex].question}</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={selectedOption ?? undefined}
                  onValueChange={setSelectedOption}
                  className="space-y-2"
                >
                  {questions[currentIndex].options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
              <CardContent className="flex justify-center">
                <Button
                  onClick={handleSubmit}
                  disabled={selectedOption === null || submitting}
                  className="gradient-button"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Enviar Resposta
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}