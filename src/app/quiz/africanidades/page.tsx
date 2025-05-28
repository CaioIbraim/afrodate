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

      // Inserir resposta
      const { error: insertError } = await supabase
        .from("quiz_responses")
        .insert({
          user_id: user.id,
          quiz_id: questions[currentIndex].id,
          selected_option: selectedIndex,
        });

      if (insertError) {
        if (insertError.code === "23505") {
          toast({
            title: "Info",
            description: "Você já respondeu esta pergunta.",
            variant: "default",
          });
          return;
        }
        console.log("Insert response error:", insertError);
        throw insertError;
      }

      // Verificar se a resposta está correta
      const isCorrect = selectedIndex === questions[currentIndex].correct_option;

      // Atualizar interesses se correto
      if (isCorrect && questions[currentIndex].category) {
        const newInterest = mapCategoryToInterest(questions[currentIndex].category);
        const currentInterests = Array.isArray(profile.interests) ? profile.interests : [];
        if (!currentInterests.includes(newInterest)) {
          const updatedInterests = [...currentInterests, newInterest];
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ interests: updatedInterests })
            .eq("id", profile.id);

          if (updateError) {
            console.log("Update interests error:", updateError);
            throw updateError;
          }
        }
      }

      toast({
        title: isCorrect ? "Correto!" : "Errado",
        description: isCorrect
          ? "Boa! Você acertou a pergunta."
          : `A resposta correta era: ${questions[currentIndex].options[questions[currentIndex].correct_option]}`,
        variant: isCorrect ? "default" : "destructive",
      });

      // Avançar ou completar
      if (currentIndex + 1 < questions.length) {
        setCurrentIndex(currentIndex + 1);
        setSelectedOption(null);
      } else {
        setCompleted(true);
      }
    } catch (error: any) {
      console.log("Error submitting answer:", error.message, error);
      toast({
        title: "Erro",
        description: `Não foi possível enviar a resposta: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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