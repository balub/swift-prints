import { CheckCircle, Circle } from "lucide-react";

interface ProgressStep {
  id: string;
  title: string;
  completed: boolean;
  current: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
}

const ProgressIndicator = ({
  steps,
  className = "",
}: ProgressIndicatorProps) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                  step.completed
                    ? "bg-primary text-white"
                    : step.current
                    ? "bg-primary/10 text-primary border-2 border-primary"
                    : "bg-neutral-100 text-text-muted"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <span
                className={`text-xs mt-2 text-center max-w-20 ${
                  step.current || step.completed
                    ? "text-text-primary font-medium"
                    : "text-text-muted"
                }`}
              >
                {step.title}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-colors duration-200 ${
                  step.completed ? "bg-primary" : "bg-neutral-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { ProgressIndicator };
