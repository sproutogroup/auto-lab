import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const loginSchema = z.object({
 username: z.string().min(1, "Username is required"),
 password: z.string().min(1, "Password is required"),
 remember_me: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
 const { user, loginMutation } = useAuth();
 const [, setLocation] = useLocation();
 const [showPassword, setShowPassword] = useState(false);

 const loginForm = useForm<LoginFormData>({
  resolver: zodResolver(loginSchema),
  defaultValues: {
   username: "",
   password: "",
   remember_me: false,
  },
 });

 // Redirect if already logged in
 useEffect(() => {
  if (user) {
   setLocation("/");
  }
 }, [user, setLocation]);

 const onLogin = (data: LoginFormData) => {
  loginMutation.mutate(data);
 };

 if (user) {
  return null; // Will redirect in useEffect
 }

 return (
  <div className="min-h-screen auth-mobile-container">
   {/* Desktop: Split screen layout */}
   <div className="hidden lg:flex lg:min-h-screen">
    {/* Left side - Logo and Branding */}
    <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden">
     {/* Subtle background pattern */}
     <div className="absolute inset-0 opacity-5">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent transform rotate-12"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent transform -rotate-12"></div>
     </div>

     <div className="text-center relative z-10">
      <div className="mb-20">
       <h1 className="text-8xl font-bold text-white italic transform -skew-x-12 hover:scale-105 transition-all duration-700 drop-shadow-2xl tracking-wider">
        AUTOLAB
       </h1>
      </div>
      <div className="space-y-6">
       <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent w-80 mx-auto"></div>
       <p className="text-gray-200 text-xl font-light tracking-[0.4em] uppercase">
        DEVELOP • CREATE • TRANSFORM
       </p>
       <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent w-80 mx-auto"></div>
      </div>
     </div>
    </div>

    {/* Right side - Login Form */}
    <div className="flex-1 flex items-center justify-center p-12 bg-gradient-to-br from-gray-50 to-white">
     <div className="w-full max-w-md">
      <div className="mb-10">
       <h1 className="text-3xl font-light text-gray-900 mb-2">Welcome back</h1>
       <p className="text-gray-500 font-light">Sign in to access your dashboard</p>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-2xl border border-gray-100">
       <Form {...loginForm}>
        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
         <FormField
          control={loginForm.control}
          name="username"
          render={({ field }) => (
           <FormItem>
            <FormControl>
             <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
               {...field}
               placeholder="Username"
               className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 pl-14 h-14 rounded-2xl focus:border-red-500 focus:ring-red-500/10 transition-all duration-300 font-light"
              />
             </div>
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />

         <FormField
          control={loginForm.control}
          name="password"
          render={({ field }) => (
           <FormItem>
            <FormControl>
             <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
               {...field}
               type={showPassword ? "text" : "password"}
               placeholder="Password"
               className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 pl-14 pr-14 h-14 rounded-2xl focus:border-red-500 focus:ring-red-500/10 transition-all duration-300 font-light"
              />
              <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
               {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
             </div>
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />

         <FormField
          control={loginForm.control}
          name="remember_me"
          render={({ field }) => (
           <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
             <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className="border-gray-300 text-red-600 focus:ring-red-500"
             />
            </FormControl>
            <div className="space-y-1 leading-none">
             <label className="text-sm font-medium text-gray-700 cursor-pointer">
              Remember me for 8 hours
             </label>
            </div>
           </FormItem>
          )}
         />

         <Button
          type="submit"
          className="w-full h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 disabled:opacity-50 mt-8"
          disabled={loginMutation.isPending}
         >
          {loginMutation.isPending ? (
           <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
           <div className="flex items-center justify-center space-x-2">
            <span>Access Dashboard</span>
            <ArrowRight className="h-5 w-5" />
           </div>
          )}
         </Button>
        </form>
       </Form>
      </div>
     </div>
    </div>
   </div>

   {/* Mobile: Single screen with black background and centered form */}
   <div className="lg:hidden min-h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex flex-col">
    {/* Subtle background pattern */}
    <div className="absolute inset-0 opacity-5">
     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/10 to-transparent transform rotate-12"></div>
     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/5 to-transparent transform -rotate-12"></div>
    </div>

    {/* Content container */}
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
     {/* Branding Section */}
     <div className="text-center mb-8">
      <div className="mb-8">
       <h1 className="text-5xl md:text-6xl font-bold text-white italic transform -skew-x-12 hover:scale-105 transition-all duration-700 drop-shadow-2xl tracking-wider">
        AUTOLAB
       </h1>
      </div>
      <div className="space-y-4 mb-8">
       <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent w-60 mx-auto"></div>
       <p className="text-gray-200 text-sm font-light tracking-[0.2em] uppercase">
        DEVELOP • CREATE • TRANSFORM
       </p>
       <div className="h-px bg-gradient-to-r from-transparent via-red-500 to-transparent w-60 mx-auto"></div>
      </div>
     </div>

     {/* Login Form */}
     <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
       <h2 className="auth-mobile-title text-white mb-2">Welcome back</h2>
       <p className="auth-mobile-subtitle text-gray-300">Sign in to access your dashboard</p>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-3xl auth-mobile-form shadow-2xl border border-white/20">
       <Form {...loginForm}>
        <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-6">
         <FormField
          control={loginForm.control}
          name="username"
          render={({ field }) => (
           <FormItem>
            <FormControl>
             <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
               {...field}
               placeholder="Username"
               className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 pl-16 auth-mobile-input rounded-2xl focus:border-red-500 focus:ring-red-500/10 transition-all duration-300 font-light"
              />
             </div>
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />

         <FormField
          control={loginForm.control}
          name="password"
          render={({ field }) => (
           <FormItem>
            <FormControl>
             <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
               {...field}
               type={showPassword ? "text" : "password"}
               placeholder="Password"
               className="bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 pl-16 pr-16 auth-mobile-input rounded-2xl focus:border-red-500 focus:ring-red-500/10 transition-all duration-300 font-light"
              />
              <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 auth-mobile-icon-button"
              >
               {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
             </div>
            </FormControl>
            <FormMessage />
           </FormItem>
          )}
         />

         <FormField
          control={loginForm.control}
          name="remember_me"
          render={({ field }) => (
           <FormItem className="flex flex-row items-center space-x-3 space-y-0">
            <FormControl>
             <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              className="border-gray-300 text-red-600 focus:ring-red-500"
             />
            </FormControl>
            <div className="space-y-1 leading-none">
             <label className="text-sm font-medium text-gray-700 cursor-pointer">
              Remember me for 8 hours
             </label>
            </div>
           </FormItem>
          )}
         />

         <Button
          type="submit"
          className="w-full auth-mobile-button bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium rounded-2xl transition-all duration-300 shadow-lg hover:shadow-red-500/25 disabled:opacity-50 mt-8"
          disabled={loginMutation.isPending}
         >
          {loginMutation.isPending ? (
           <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
           <div className="flex items-center justify-center space-x-2">
            <span>Access Dashboard</span>
            <ArrowRight className="h-5 w-5" />
           </div>
          )}
         </Button>
        </form>
       </Form>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
}
