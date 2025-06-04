// src/hooks/useSignupForm.ts
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { signupSchema, SignupFormValues } from "@/lib/validators/signupSchema"

export function useSignupForm() {
  return useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: "onTouched",
  })
}
