import OpenAI from "openai";
import { Notification } from "../../shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});

export interface SmartNotificationRequest {
 context: string;
 entityType: string;
 entityData: any;
 userRole: string;
 urgency?: "low" | "medium" | "high" | "urgent" | "critical";
 customInstructions?: string;
}

export interface SmartNotificationResponse {
 title: string;
 message: string;
 priority: "low" | "medium" | "high" | "urgent" | "critical";
 type: string;
 scheduledFor?: Date;
 actionUrl?: string;
 metadata?: any;
}

export class OpenAINotificationService {
 private static instance: OpenAINotificationService;

 public static getInstance(): OpenAINotificationService {
  if (!OpenAINotificationService.instance) {
   OpenAINotificationService.instance = new OpenAINotificationService();
  }
  return OpenAINotificationService.instance;
 }

 /**
  * Generate intelligent notification content based on dealership context
  */
 async generateSmartNotification(request: SmartNotificationRequest): Promise<SmartNotificationResponse> {
  try {
   const prompt = this.buildNotificationPrompt(request);

   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content: `You are an AI assistant for a luxury automotive dealership management system. Your role is to generate intelligent, context-aware notifications that help dealership staff manage their operations efficiently. 

            Always respond in JSON format with the following structure:
            {
              "title": "Brief, actionable title (max 50 characters)",
              "message": "Clear, professional message (max 200 characters)",
              "priority": "low|medium|high|urgent|critical",
              "type": "lead|sale|inventory|task|appointment|financial|system",
              "scheduledFor": "ISO date string (optional)",
              "actionUrl": "URL for quick action (optional)",
              "metadata": "Additional context object (optional)"
            }

            Guidelines:
            - Use luxury, professional language appropriate for high-end automotive dealership
            - Focus on actionable insights that drive sales and customer satisfaction
            - Prioritize based on business impact and time sensitivity
            - Include specific details from the provided context
            - Suggest optimal timing for notifications based on dealership operations
            - Match notification type to the business context`,
     },
     {
      role: "user",
      content: prompt,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 500,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");

   return {
    title: result.title || "Dealership Update",
    message: result.message || "New update available",
    priority: this.validatePriority(result.priority) || "medium",
    type: this.validateType(result.type) || "system",
    scheduledFor: result.scheduledFor ? new Date(result.scheduledFor) : undefined,
    actionUrl: result.actionUrl,
    metadata: result.metadata,
   };
  } catch (error) {
   console.error("OpenAI notification generation failed:", error);
   return this.fallbackNotification(request);
  }
 }

 /**
  * Analyze notification content and optimize for engagement
  */
 async optimizeNotificationContent(
  title: string,
  message: string,
  context: string,
 ): Promise<{ title: string; message: string; engagementScore: number }> {
  try {
   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content: `You are an expert in notification optimization for luxury automotive dealerships. Analyze and improve notification content for maximum engagement and clarity.

            Respond in JSON format:
            {
              "title": "Optimized title (max 50 characters)",
              "message": "Optimized message (max 200 characters)",
              "engagementScore": number between 1-10,
              "improvements": ["list of improvements made"]
            }

            Focus on:
            - Clarity and actionability
            - Professional luxury brand tone
            - Urgency without being pushy
            - Personalization where possible
            - Clear call-to-action`,
     },
     {
      role: "user",
      content: `Optimize this notification:
            Title: ${title}
            Message: ${message}
            Context: ${context}`,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
    max_tokens: 400,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");

   return {
    title: result.title || title,
    message: result.message || message,
    engagementScore: result.engagementScore || 5,
   };
  } catch (error) {
   console.error("Notification optimization failed:", error);
   return { title, message, engagementScore: 5 };
  }
 }

 /**
  * Analyze user behavior and suggest optimal notification timing
  */
 async suggestOptimalTiming(
  userId: number,
  notificationType: string,
  urgency: string,
  userActivity?: any,
 ): Promise<{ scheduledFor: Date; reasoning: string }> {
  try {
   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content: `You are a scheduling optimization expert for dealership notifications. Analyze user patterns and suggest optimal delivery timing.

            Respond in JSON format:
            {
              "scheduledFor": "ISO date string",
              "reasoning": "Brief explanation of timing choice",
              "confidence": number between 1-10
            }

            Consider:
            - Dealership business hours (8 AM - 6 PM typical)
            - Notification urgency levels
            - User role and responsibilities
            - Avoiding notification fatigue
            - Peak engagement times for automotive sales`,
     },
     {
      role: "user",
      content: `Suggest optimal timing for:
            User ID: ${userId}
            Notification Type: ${notificationType}
            Urgency: ${urgency}
            User Activity: ${JSON.stringify(userActivity || {})}`,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 300,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");

   return {
    scheduledFor: result.scheduledFor ? new Date(result.scheduledFor) : new Date(),
    reasoning: result.reasoning || "Immediate delivery recommended",
   };
  } catch (error) {
   console.error("Timing optimization failed:", error);
   return {
    scheduledFor: new Date(),
    reasoning: "Default immediate delivery",
   };
  }
 }

 /**
  * Generate contextual follow-up notifications
  */
 async generateFollowUpNotification(
  originalNotification: Notification,
  userResponse: "read" | "dismissed" | "clicked" | "ignored",
  timeElapsed: number,
 ): Promise<SmartNotificationResponse | null> {
  try {
   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content: `You are a follow-up notification specialist for luxury automotive dealerships. Generate appropriate follow-up notifications based on user interaction with previous notifications.

            Respond in JSON format or null if no follow-up is needed:
            {
              "title": "Follow-up title",
              "message": "Follow-up message",
              "priority": "priority level",
              "type": "notification type",
              "scheduledFor": "ISO date string",
              "shouldSend": boolean
            }

            Guidelines:
            - Only suggest follow-ups for important, unaddressed items
            - Avoid notification spam
            - Escalate priority for ignored critical items
            - Use different messaging approach for follow-ups
            - Consider time elapsed since original notification`,
     },
     {
      role: "user",
      content: `Generate follow-up for:
            Original: ${JSON.stringify(originalNotification)}
            User Response: ${userResponse}
            Time Elapsed: ${timeElapsed} minutes`,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.4,
    max_tokens: 300,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");

   if (!result.shouldSend) {
    return null;
   }

   return {
    title: result.title || "Follow-up Required",
    message: result.message || "Previous notification requires attention",
    priority: this.validatePriority(result.priority) || "medium",
    type: this.validateType(result.type) || originalNotification.type,
    scheduledFor: result.scheduledFor ? new Date(result.scheduledFor) : undefined,
   };
  } catch (error) {
   console.error("Follow-up generation failed:", error);
   return null;
  }
 }

 /**
  * Analyze dealership data to predict notification needs
  */
 async predictNotificationNeeds(
  dealershipData: any,
  timeframe: "today" | "this_week" | "this_month" = "today",
 ): Promise<SmartNotificationResponse[]> {
  try {
   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content: `You are a predictive analytics specialist for luxury automotive dealerships. Analyze dealership data and predict what notifications should be sent to optimize operations.

            Respond with a JSON array of notification recommendations:
            [{
              "title": "Predicted notification title",
              "message": "Predicted notification message",
              "priority": "priority level",
              "type": "notification type",
              "scheduledFor": "ISO date string",
              "targetUsers": ["user roles to notify"],
              "reasoning": "Why this notification is predicted to be needed"
            }]

            Focus on:
            - Inventory management alerts
            - Sales opportunity notifications
            - Customer follow-up reminders
            - Financial milestone alerts
            - Staff task assignments
            - Appointment scheduling optimization`,
     },
     {
      role: "user",
      content: `Analyze dealership data and predict notification needs for ${timeframe}:
            ${JSON.stringify(dealershipData)}`,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.6,
    max_tokens: 800,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");
   const predictions = result.predictions || [];

   return predictions.map((pred: any) => ({
    title: pred.title || "Predicted Update",
    message: pred.message || "System prediction",
    priority: this.validatePriority(pred.priority) || "medium",
    type: this.validateType(pred.type) || "system",
    scheduledFor: pred.scheduledFor ? new Date(pred.scheduledFor) : undefined,
    metadata: {
     targetUsers: pred.targetUsers || [],
     reasoning: pred.reasoning || "AI prediction",
     confidence: pred.confidence || 0.5,
    },
   }));
  } catch (error) {
   console.error("Notification prediction failed:", error);
   return [];
  }
 }

 private buildNotificationPrompt(request: SmartNotificationRequest): string {
  return `Generate a smart notification for a luxury automotive dealership:

    Context: ${request.context}
    Entity Type: ${request.entityType}
    Entity Data: ${JSON.stringify(request.entityData)}
    User Role: ${request.userRole}
    Urgency: ${request.urgency || "medium"}
    Custom Instructions: ${request.customInstructions || "None"}

    Generate an intelligent notification that:
    1. Provides clear, actionable information
    2. Uses appropriate priority level based on business impact
    3. Includes relevant details from the entity data
    4. Matches the professional luxury dealership tone
    5. Suggests optimal timing if not immediate
    6. Provides a relevant action URL if applicable

    Consider the user's role and tailor the message accordingly.`;
 }

 private validatePriority(priority: string): "low" | "medium" | "high" | "urgent" | "critical" {
  const validPriorities = ["low", "medium", "high", "urgent", "critical"];
  return validPriorities.includes(priority) ? (priority as any) : "medium";
 }

 private validateType(type: string): string {
  const validTypes = ["lead", "sale", "inventory", "task", "appointment", "financial", "system"];
  return validTypes.includes(type) ? type : "system";
 }

 private fallbackNotification(request: SmartNotificationRequest): SmartNotificationResponse {
  return {
   title: `${request.entityType} Update`,
   message: `New ${request.entityType.toLowerCase()} requires attention`,
   priority: request.urgency || "medium",
   type: request.entityType.toLowerCase(),
   scheduledFor: undefined,
   actionUrl: undefined,
   metadata: { fallback: true },
  };
 }
}

export const openaiNotificationService = OpenAINotificationService.getInstance();
