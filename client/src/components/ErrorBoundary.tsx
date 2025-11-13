import React from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
 hasError: boolean;
 error?: Error;
 errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
 children: React.ReactNode;
 fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
 constructor(props: ErrorBoundaryProps) {
  super(props);
  this.state = { hasError: false };
 }

 static getDerivedStateFromError(error: Error): ErrorBoundaryState {
  return { hasError: true, error };
 }

 componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  console.error("Error boundary caught an error:", error, errorInfo);
  this.setState({ error, errorInfo });
 }

 handleReset = () => {
  this.setState({ hasError: false, error: undefined, errorInfo: undefined });
 };

 render() {
  if (this.state.hasError) {
   if (this.props.fallback) {
    const FallbackComponent = this.props.fallback;
    return <FallbackComponent error={this.state.error!} reset={this.handleReset} />;
   }

   return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
     <div className="max-w-md w-full mx-auto p-6 text-center">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
       <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
       <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
       <p className="text-sm text-red-600 mb-4">
        We encountered an unexpected error. Please try refreshing the page or contact support if the problem
        persists.
       </p>
       <div className="space-y-2">
        <Button onClick={this.handleReset} variant="outline" className="w-full">
         Try Again
        </Button>
        <Button onClick={() => window.location.reload()} className="w-full">
         Refresh Page
        </Button>
       </div>
       {process.env.NODE_ENV === "development" && this.state.error && (
        <details className="mt-4 text-left">
         <summary className="text-sm font-medium cursor-pointer">Error Details (Development)</summary>
         <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
          {this.state.error.message}
          {this.state.error.stack}
         </pre>
        </details>
       )}
      </div>
     </div>
    </div>
   );
  }

  return this.props.children;
 }
}

export default ErrorBoundary;
