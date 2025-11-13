import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ServiceWorkerTest {
 test: string;
 status: "pending" | "pass" | "fail";
 message: string;
}

export const ServiceWorkerTest: React.FC = () => {
 const [tests, setTests] = useState<ServiceWorkerTest[]>([]);
 const [isRunning, setIsRunning] = useState(false);

 const runTests = async () => {
  setIsRunning(true);
  const testResults: ServiceWorkerTest[] = [];

  // Test 1: Service Worker Support
  testResults.push({
   test: "Service Worker Support",
   status: "serviceWorker" in navigator ? "pass" : "fail",
   message: "serviceWorker" in navigator ? "Supported" : "Not supported",
  });

  // Test 2: Push Manager Support
  testResults.push({
   test: "Push Manager Support",
   status: "PushManager" in window ? "pass" : "fail",
   message: "PushManager" in window ? "Supported" : "Not supported",
  });

  // Test 3: Notification Support
  testResults.push({
   test: "Notification Support",
   status: "Notification" in window ? "pass" : "fail",
   message: "Notification" in window ? "Supported" : "Not supported",
  });

  // Test 4: HTTPS/Protocol Check
  testResults.push({
   test: "HTTPS/Protocol Check",
   status: location.protocol === "https:" || location.hostname === "localhost" ? "pass" : "fail",
   message: `Current protocol: ${location.protocol}, hostname: ${location.hostname}`,
  });

  // Test 5: Service Worker File Access
  try {
   const response = await fetch("/sw.js");
   const contentType = response.headers.get("content-type");
   testResults.push({
    test: "Service Worker File Access",
    status: response.ok ? "pass" : "fail",
    message: response.ok
     ? `File accessible (${response.status}, ${contentType})`
     : `File not accessible (${response.status})`,
   });
  } catch (error) {
   testResults.push({
    test: "Service Worker File Access",
    status: "fail",
    message: `Network error: ${error.message}`,
   });
  }

  // Test 6: Service Worker Registration
  if ("serviceWorker" in navigator) {
   try {
    console.log("=== MANUAL SERVICE WORKER REGISTRATION TEST ===");

    // Try to register with explicit error handling
    const registration = await navigator.serviceWorker.register("/sw.js", {
     scope: "/",
     updateViaCache: "none",
    });

    console.log("Registration successful:", registration);

    testResults.push({
     test: "Service Worker Registration",
     status: "pass",
     message: `Registration successful (scope: ${registration.scope})`,
    });

    // Wait for service worker to be ready
    try {
     const readyRegistration = await navigator.serviceWorker.ready;
     console.log("Service worker ready:", readyRegistration);

     testResults.push({
      test: "Service Worker Ready",
      status: "pass",
      message: `Service worker ready (state: ${readyRegistration.active?.state})`,
     });
    } catch (readyError) {
     console.error("Service worker ready failed:", readyError);
     testResults.push({
      test: "Service Worker Ready",
      status: "fail",
      message: `Ready failed: ${readyError.message}`,
     });
    }
   } catch (error) {
    console.error("Service worker registration failed:", error);
    testResults.push({
     test: "Service Worker Registration",
     status: "fail",
     message: `Registration failed: ${error.message}`,
    });
   }
  }

  setTests(testResults);
  setIsRunning(false);
 };

 const getStatusColor = (status: ServiceWorkerTest["status"]) => {
  switch (status) {
   case "pass":
    return "bg-green-100 text-green-800";
   case "fail":
    return "bg-red-100 text-red-800";
   case "pending":
    return "bg-yellow-100 text-yellow-800";
   default:
    return "bg-gray-100 text-gray-800";
  }
 };

 return (
  <Card className="w-full max-w-2xl mx-auto">
   <CardHeader>
    <CardTitle>Service Worker Diagnostic Test</CardTitle>
    <CardDescription>Test service worker functionality on this device</CardDescription>
   </CardHeader>
   <CardContent>
    <div className="space-y-4">
     <Button onClick={runTests} disabled={isRunning}>
      {isRunning ? "Running Tests..." : "Run Tests"}
     </Button>

     {tests.length > 0 && (
      <div className="space-y-3">
       {tests.map((test, index) => (
        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
         <div className="flex-1">
          <div className="font-medium">{test.test}</div>
          <div className="text-sm text-gray-600">{test.message}</div>
         </div>
         <Badge className={getStatusColor(test.status)}>{test.status.toUpperCase()}</Badge>
        </div>
       ))}
      </div>
     )}

     <div className="text-sm text-gray-500 space-y-1">
      <div>
       <strong>User Agent:</strong> {navigator.userAgent}
      </div>
      <div>
       <strong>Location:</strong> {window.location.href}
      </div>
      <div>
       <strong>Protocol:</strong> {window.location.protocol}
      </div>
     </div>
    </div>
   </CardContent>
  </Card>
 );
};
