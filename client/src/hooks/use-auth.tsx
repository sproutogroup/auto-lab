import { createContext, ReactNode, useContext } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { User, InsertUser } from "@shared/schema";
import { apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
 user: User | null;
 isLoading: boolean;
 error: Error | null;
 loginMutation: UseMutationResult<User, Error, LoginData>;
 logoutMutation: UseMutationResult<void, Error, void>;
 registerMutation: UseMutationResult<User, Error, RegisterData>;
 updateProfileMutation: UseMutationResult<User, Error, ProfileData>;
 changePasswordMutation: UseMutationResult<void, Error, ChangePasswordData>;
};

type LoginData = {
 username: string;
 password: string;
 remember_me?: boolean;
};

type RegisterData = InsertUser;

type ProfileData = {
 first_name?: string;
 last_name?: string;
 email?: string;
};

type ChangePasswordData = {
 current_password: string;
 new_password: string;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
 const { toast } = useToast();

 const {
  data: user,
  error,
  isLoading,
 } = useQuery<User | null, Error>({
  queryKey: ["/api/auth/user"],
  queryFn: async () => {
   try {
    const response = await fetch("/api/auth/user", {
     credentials: "include",
    });
    if (response.status === 401) {
     return null; // Not authenticated
    }
    if (!response.ok) {
     throw new Error("Failed to fetch user");
    }
    const data = await response.json();
    return data.user;
   } catch (error) {
    console.error("Auth check error:", error);
    return null;
   }
  },
  retry: false,
  staleTime: 1000 * 60 * 5, // 5 minutes
 });

 const loginMutation = useMutation({
  mutationFn: async (credentials: LoginData) => {
   const response = await apiRequest("POST", "/api/auth/login", credentials);
   const data = await response.json();
   return data.user;
  },
  onSuccess: (user: User) => {
   queryClient.setQueryData(["/api/auth/user"], user);
   queryClient.invalidateQueries();
   toast({
    title: "Login successful",
    description: `Welcome back, ${user.first_name || user.username}!`,
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Login failed",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 const registerMutation = useMutation({
  mutationFn: async (data: RegisterData) => {
   const response = await apiRequest("POST", "/api/auth/register", data);
   const result = await response.json();
   return result.user;
  },
  onSuccess: (user: User) => {
   queryClient.setQueryData(["/api/auth/user"], user);
   queryClient.invalidateQueries();
   toast({
    title: "Registration successful",
    description: `Welcome, ${user.first_name || user.username}!`,
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Registration failed",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 const logoutMutation = useMutation({
  mutationFn: async () => {
   await apiRequest("POST", "/api/auth/logout");
  },
  onSuccess: () => {
   queryClient.setQueryData(["/api/auth/user"], null);
   queryClient.clear();
   toast({
    title: "Logged out",
    description: "You have been successfully logged out",
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Logout failed",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 const updateProfileMutation = useMutation({
  mutationFn: async (data: ProfileData) => {
   const response = await apiRequest("PUT", "/api/auth/profile", data);
   const result = await response.json();
   return result.user;
  },
  onSuccess: (user: User) => {
   queryClient.setQueryData(["/api/auth/user"], user);
   toast({
    title: "Profile updated",
    description: "Your profile has been updated successfully",
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Update failed",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 const changePasswordMutation = useMutation({
  mutationFn: async (data: ChangePasswordData) => {
   await apiRequest("PUT", "/api/auth/change-password", data);
  },
  onSuccess: () => {
   toast({
    title: "Password changed",
    description: "Your password has been changed successfully",
   });
  },
  onError: (error: Error) => {
   toast({
    title: "Password change failed",
    description: error.message,
    variant: "destructive",
   });
  },
 });

 return (
  <AuthContext.Provider
   value={{
    user: user ?? null,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
    updateProfileMutation,
    changePasswordMutation,
   }}
  >
   {children}
  </AuthContext.Provider>
 );
}

export function useAuth() {
 const context = useContext(AuthContext);
 if (!context) {
  throw new Error("useAuth must be used within an AuthProvider");
 }
 return context;
}
