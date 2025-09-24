import { toast } from "@/hooks/use-toast";

export interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  url: string;
  userId?: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errors: ErrorInfo[] = [];
  private maxErrors = 50;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  logError(error: Error, context?: string, userId?: string): void {
    const errorInfo: ErrorInfo = {
      message: error.message,
      stack: error.stack,
      componentStack: context,
      timestamp: Date.now(),
      url: window.location.href,
      userId,
    };

    this.errors.push(errorInfo);

    // Keep only the latest errors
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Error logged:", errorInfo);
    }

    // Send to server for production logging
    if (process.env.NODE_ENV === "production") {
      this.sendToServer(errorInfo);
    }
  }

  private async sendToServer(errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch("/api/errors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(errorInfo),
      });
    } catch (err) {
      console.error("Failed to send error to server:", err);
    }
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  handleApiError(error: Error, showToast = true): void {
    this.logError(error, "API Error");

    if (showToast) {
      toast({
        title: "Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  }

  handleValidationError(validationErrors: Record<string, string[]>): void {
    const errorMessage = Object.entries(validationErrors)
      .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
      .join("\n");

    this.logError(new Error(errorMessage), "Validation Error");

    toast({
      title: "Validation Error",
      description: "Please check the form fields and try again",
      variant: "destructive",
    });
  }
}

export const errorHandler = ErrorHandler.getInstance();
