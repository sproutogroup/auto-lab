import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { errorHandler } from "./errorHandler";
import { performanceMonitor } from "./performanceMonitor";

async function throwIfResNotOk(res: Response) {
 if (!res.ok) {
  const text = (await res.text()) || res.statusText;
  const error = new Error(`${res.status}: ${text}`);

  // Log different error types based on status code
  if (res.status >= 500) {
   errorHandler.logError(error, "Server Error");
  } else if (res.status >= 400) {
   errorHandler.logError(error, "Client Error");
  }

  throw error;
 }
}

export async function apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response> {
 const operationName = `${method.toLowerCase()}_${url.replace(/[^a-zA-Z0-9]/g, "_")}`;

 return performanceMonitor.measureApiCall(async () => {
  try {
   const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
   });

   await throwIfResNotOk(res);
   return res;
  } catch (error) {
   const errorInstance = error instanceof Error ? error : new Error(String(error));
   errorHandler.logError(errorInstance, `API Request: ${method} ${url}`);
   throw errorInstance;
  }
 }, operationName);
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
 ({ on401: unauthorizedBehavior }) =>
 async ({ queryKey }) => {
  const res = await fetch(queryKey[0] as string, {
   credentials: "include",
  });

  if (unauthorizedBehavior === "returnNull" && res.status === 401) {
   return null;
  }

  await throwIfResNotOk(res);
  return await res.json();
 };

// Create QueryClient with Chrome compatibility and enhanced error handling
export const queryClient = new QueryClient({
 defaultOptions: {
  queries: {
   queryFn: getQueryFn({ on401: "throw" }),
   refetchInterval: false, // Disable by default, enable per-query as needed
   refetchOnWindowFocus: false, // Disable by default, enable per-query as needed
   staleTime: 1000 * 60 * 5, // 5 minutes default
   retry: (failureCount, error) => {
    // Don't retry on 4xx errors (client errors)
    if (error instanceof Error && error.message.includes("4")) {
     return false;
    }
    return failureCount < 3;
   },
   // Removed deprecated onError - use individual query error handling instead
  },
  mutations: {
   retry: (failureCount, error) => {
    // Don't retry on validation errors
    if (error instanceof Error && error.message.includes("validation")) {
     return false;
    }
    return failureCount < 2;
   },
   // Removed deprecated onError - use individual mutation error handling instead
  },
 },
});
