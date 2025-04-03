import { cn } from "@/lib/utils"

interface ProgressStepsProps {
  steps: number
  currentStep: number
  className?: string
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <div className={cn("flex items-center justify-between w-full max-w-xs mx-auto my-6", className)}>
      {Array.from({ length: steps }).map((_, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              "rounded-full transition-all duration-300 flex items-center justify-center",
              index + 1 <= currentStep
                ? "bg-gradient-to-r from-oraculo-purple to-oraculo-cyan text-white w-8 h-8"
                : "bg-white border border-oraculo-purple/30 text-oraculo-muted w-7 h-7",
            )}
          >
            {index + 1}
          </div>

          {index < steps - 1 && (
            <div
              className={cn("h-0.5 w-10 mx-1", index + 1 < currentStep ? "bg-oraculo-cyan" : "bg-oraculo-purple/30")}
            />
          )}
        </div>
      ))}
    </div>
  )
}

