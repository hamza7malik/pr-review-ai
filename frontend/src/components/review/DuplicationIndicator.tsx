import { AlertTriangle, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";

interface DuplicationIndicatorProps {
  percentage: number;
  severity: "low" | "medium" | "high";
  duplicatedLines: number;
  totalLines: number;
  duplicateBlocksCount: number;
  onViewDetails: () => void;
}

export function DuplicationIndicator({
  percentage,
  severity,
  duplicatedLines,
  totalLines,
  duplicateBlocksCount,
  onViewDetails,
}: DuplicationIndicatorProps) {
  const getSeverityConfig = () => {
    switch (severity) {
      case "high":
        return {
          color: "bg-red-500",
          circleColor: "text-red-500",
          textColor: "text-red-700",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          icon: AlertTriangle,
          label: "High Duplication",
          message:
            "Significant code duplication detected. Consider refactoring.",
        };
      case "medium":
        return {
          color: "bg-yellow-500",
          circleColor: "text-yellow-500",
          textColor: "text-yellow-700",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          icon: AlertCircle,
          label: "Moderate Duplication",
          message:
            "Some code duplication found. Review for refactoring opportunities.",
        };
      default:
        return {
          color: "bg-green-500",
          circleColor: "text-green-500",
          textColor: "text-green-700",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          icon: CheckCircle2,
          label: "Low Duplication",
          message: "Minimal code duplication detected. Good job!",
        };
    }
  };

  const config = getSeverityConfig();
  const Icon = config.icon;

  return (
    <Card className={`${config.borderColor} border-2`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className={`h-5 w-5 ${config.textColor}`} />
          Code Duplication Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular Progress Gauge */}
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${
                  2 * Math.PI * 56 * (1 - percentage / 100)
                }`}
                className={config.circleColor}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${config.circleColor}`}>
                {Math.round(percentage)}%
              </span>
              <span className="text-xs text-muted-foreground mt-1">
                duplication
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar Alternative */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{config.label}</span>
            <span className="text-muted-foreground">
              {duplicatedLines} / {totalLines} lines
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full ${config.color} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Message */}
        <div
          className={`${config.bgColor} ${config.borderColor} border rounded-lg p-3`}
        >
          <p className={`text-sm ${config.textColor} font-medium`}>
            {config.message}
          </p>
        </div>

        {/* View Details Button */}
        {duplicateBlocksCount > 0 && (
          <Button
            onClick={onViewDetails}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Eye className="mr-2 h-4 w-4" />
            View {duplicateBlocksCount} Duplicate Block
            {duplicateBlocksCount !== 1 ? "s" : ""}
          </Button>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>&lt;15%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>15-30%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>&gt;30%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
