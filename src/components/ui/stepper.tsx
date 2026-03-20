import * as React from "react"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  activeStep: number
  children: React.ReactNode
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ activeStep, className, children, ...props }, ref) => {
    const steps = React.Children.toArray(children)

    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-row items-center justify-between w-full relative",
          className
        )}
        {...props}
      >
        {steps.map((step, index) => {
          if (!React.isValidElement(step)) return null

          const isCompleted = index + 1 < activeStep
          const isActive = index + 1 === activeStep
          const isLast = index === steps.length - 1

          return React.cloneElement(step as React.ReactElement, {
            index,
            isCompleted,
            isActive,
            isLast,
          })
        })}
      </div>
    )
  }
)
Stepper.displayName = "Stepper"

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  index?: number
  isCompleted?: boolean
  isActive?: boolean
  isLast?: boolean
}

const Step = React.forwardRef<HTMLDivElement, StepProps>(
  (
    {
      title,
      index = 0,
      isCompleted = false,
      isActive = false,
      isLast = false,
      className,
      ...props
    },
    ref
  ) => {
    const stepNumber = index + 1

    return (
      <div
        ref={ref}
        className={cn("flex flex-col items-center flex-1 relative", className)}
        {...props}
      >
        <div className="relative flex items-center justify-center w-full">
          {/* Connecting Line */}
          {!isLast && (
            <div
              className={cn(
                "absolute top-1/2 right-1/2 w-full h-[2px] -translate-y-1/2 z-0 transition-colors duration-200",
                isCompleted ? "bg-primary" : "bg-muted"
              )}
            />
          )}
          
          {/* Circle Indicator */}
          <div
            className={cn(
              "relative z-10 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full border-2 font-semibold text-sm transition-colors duration-200",
              isActive && "border-primary text-primary bg-background ring-4 ring-primary/10",
              isCompleted && "border-primary bg-primary text-primary-foreground",
              !isActive && !isCompleted && "border-muted text-muted-foreground bg-background"
            )}
          >
            {isCompleted ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : stepNumber}
          </div>
        </div>

        {/* Text */}
        <span
          className={cn(
            "mt-3 text-xs md:text-sm font-medium px-2 text-center",
            isActive || isCompleted ? "text-primary" : "text-muted-foreground"
          )}
        >
          {title}
        </span>
      </div>
    )
  }
)
Step.displayName = "Step"

export { Stepper, Step }
