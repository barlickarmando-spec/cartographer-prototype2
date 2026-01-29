interface ProgressStepperProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressStepper({ currentStep, totalSteps }: ProgressStepperProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-2 flex-1 rounded-full ${
            i < currentStep
              ? "bg-slate-900"
              : i === currentStep
              ? "bg-slate-600"
              : "bg-slate-200"
          }`}
        />
      ))}
    </div>
  );
}
