import OpenAI from "openai";
import { storage } from "../storage";

// Initialize OpenAI client with proper error handling
const openai = new OpenAI({
 apiKey: process.env.OPENAI_API_KEY,
});

// Verify OpenAI configuration on startup
if (!process.env.OPENAI_API_KEY) {
 console.error("WARNING: OPENAI_API_KEY environment variable is not set!");
} else {
 console.log("OpenAI API key configured successfully");
}

export interface AIConversationRequest {
 message: string;
 context?: string;
 conversation_history?: Array<{
  role: "user" | "assistant";
  content: string;
 }>;
}

export interface AIConversationResponse {
 message: string;
 context_used: string[];
 suggestions?: string[];
}

export class AIBusinessIntelligenceService {
 private static instance: AIBusinessIntelligenceService;
 private contextCache: any = null;
 private cacheTimestamp: number = 0;
 private readonly CACHE_DURATION = 30000; // 30 seconds cache

 public static getInstance(): AIBusinessIntelligenceService {
  if (!AIBusinessIntelligenceService.instance) {
   AIBusinessIntelligenceService.instance = new AIBusinessIntelligenceService();
  }
  return AIBusinessIntelligenceService.instance;
 }

 /**
  * Process conversational message with full dealership context
  */
 async processConversation(request: AIConversationRequest): Promise<AIConversationResponse> {
  try {
   console.log("Starting AI conversation processing for message:", request.message);

   // Fetch current dealership data for context
   const contextData = await this.fetchDealershipContext();
   console.log("Context data fetched, keys:", Object.keys(contextData));

   // Generate conversational response with context
   const response = await this.generateConversationalResponse(request, contextData);
   console.log("AI response generated successfully");

   return response;
  } catch (error) {
   console.error("AI Conversation processing failed:", error);
   return {
    message:
     "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
    context_used: [],
    suggestions: [
     "Try asking about your current inventory",
     "Ask about recent sales performance",
     "Inquire about customer analytics",
    ],
   };
  }
 }

 /**
  * Fetch comprehensive dealership context for AI conversations
  */
 private async fetchDealershipContext(): Promise<any> {
  try {
   // Check cache first
   const now = Date.now();
   if (this.contextCache && now - this.cacheTimestamp < this.CACHE_DURATION) {
    console.log("Using cached context data");
    return this.contextCache;
   }

   console.log("Fetching fresh dealership context data...");

   // Fetch only essential data in parallel for faster response
   const [dashboard, vehicles, customers, leads] = await Promise.all([
    storage.getDashboardStats(),
    storage.getVehicles({ limit: 100 }), // Get recent vehicles
    storage.getCustomerStats(),
    storage.getLeadStats(),
   ]);

   // Build simplified context with key metrics
   const contextData = {
    currentInventory: {
     totalStock: dashboard.stockSummary.totalVehicles,
     totalValue: dashboard.stockSummary.totalValue,
     uniqueMakes: dashboard.stockSummary.uniqueMakes,
     recentVehicles: vehicles.slice(0, 5).map(v => ({
      stockNumber: v.stock_number,
      make: v.make,
      model: v.model,
      status: v.sales_status,
      price: v.purchase_price_total || 0,
     })),
    },
    salesMetrics: {
     weeklySales: dashboard.weeklySales,
     monthlySales: dashboard.monthlySales,
     financeSales: dashboard.financeSales,
    },
    customerMetrics: {
     totalCustomers: customers.totalCustomers,
     activeCustomers: customers.activeCustomers,
     highValueCustomers: customers.highValueCustomers,
     conversionRate: customers.conversionRate,
    },
    leadMetrics: {
     totalLeads: leads.totalLeads,
     activeLeads: leads.activeLeads,
     conversionRate: leads.conversionRate,
     leadsByStage: leads.leadsByStage,
    },
   };

   // Cache the results
   this.contextCache = contextData;
   this.cacheTimestamp = now;

   console.log("Context data fetched and cached successfully");
   return contextData;
  } catch (error) {
   console.error("Error fetching dealership context:", error);
   // Return cached data if available, even if expired
   return this.contextCache || {};
  }
 }

 /**
  * Generate conversational response using OpenAI with dealership context
  */
 private async generateConversationalResponse(
  request: AIConversationRequest,
  contextData: any,
 ): Promise<AIConversationResponse> {
  try {
   // Check if OpenAI is properly initialized
   if (!openai) {
    throw new Error("OpenAI client is not initialized");
   }

   console.log("Building system prompt with context data...");

   const systemPrompt = `You are AUTOLAB AI, a sophisticated business intelligence assistant for a luxury automotive dealership. You have real-time access to all dealership data.

CURRENT DEALERSHIP DATA:
- Inventory: ${contextData.currentInventory?.totalStock || 0} vehicles in stock worth £${(contextData.currentInventory?.totalValue || 0).toLocaleString()}
- Makes: ${contextData.currentInventory?.uniqueMakes || 0} unique brands
- Weekly Sales: ${contextData.salesMetrics?.weeklySales?.thisWeek || 0} units (£${(contextData.salesMetrics?.weeklySales?.thisWeekValue || 0).toLocaleString()})
- Monthly Sales: ${contextData.salesMetrics?.monthlySales?.count || 0} units, £${(contextData.salesMetrics?.monthlySales?.revenue || 0).toLocaleString()} revenue
- Customers: ${contextData.customerMetrics?.totalCustomers || 0} total, ${contextData.customerMetrics?.activeCustomers || 0} active
- Leads: ${contextData.leadMetrics?.totalLeads || 0} total, ${contextData.leadMetrics?.activeLeads || 0} active

Recent Vehicles in Stock:
${contextData.currentInventory?.recentVehicles?.map(v => `- ${v.stockNumber}: ${v.make} ${v.model} (${v.status})`).join("\n") || "No vehicles found"}

INSTRUCTIONS:
1. Always provide specific numbers and insights from the actual data above
2. Be conversational but professional
3. If asked about something not in the current data, explain what data you have access to
4. Suggest actionable insights based on the metrics
5. Format responses with clear structure using bullet points or numbered lists when appropriate
6. Keep responses concise but informative (max 3-4 paragraphs)

Remember: You're speaking as an expert who knows this specific dealership inside and out.`;

   const messages = [
    { role: "system", content: systemPrompt },
    ...(request.conversation_history || []),
    { role: "user", content: request.message },
   ];

   console.log("Calling OpenAI API with message count:", messages.length);
   console.log("User message:", request.message);

   const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Using faster model for better response times
    messages: messages as any,
    temperature: 0.7,
    max_tokens: 1000, // Reduced for faster responses
    stream: false,
   });

   console.log("OpenAI API response received");
   console.log("Response usage:", response.usage);

   const aiMessage = response.choices[0].message?.content || "I'm sorry, I couldn't process your request.";
   console.log("AI message length:", aiMessage.length);

   return {
    message: aiMessage,
    context_used: Object.keys(contextData),
    suggestions: this.generateFollowUpSuggestions(request.message, contextData),
   };
  } catch (error) {
   console.error("OpenAI API error:", error);
   throw new Error(`OpenAI API call failed: ${error.message}`);
  }
 }

 /**
  * Generate contextual follow-up suggestions based on the conversation
  */
 private generateFollowUpSuggestions(message: string, contextData: any): string[] {
  const suggestions: string[] = [];
  const messageLower = message.toLowerCase();

  // Context-aware suggestions based on the message
  if (messageLower.includes("inventory") || messageLower.includes("stock")) {
   suggestions.push(
    "What's our slowest-moving stock?",
    "Show me inventory turnover rates",
    "Which vehicles have been in stock longest?",
   );
  } else if (messageLower.includes("sales") || messageLower.includes("revenue")) {
   suggestions.push(
    "What's our conversion rate from leads to sales?",
    "Show me top-performing salespeople",
    "How does this month compare to last month?",
   );
  } else if (messageLower.includes("customer") || messageLower.includes("client")) {
   suggestions.push(
    "Who are our highest-value customers?",
    "What's our customer retention rate?",
    "Show me recent customer interactions",
   );
  } else if (messageLower.includes("lead") || messageLower.includes("prospect")) {
   suggestions.push(
    "Which leads need immediate follow-up?",
    "What's our lead conversion pipeline?",
    "Show me lead quality metrics",
   );
  } else {
   // General suggestions
   suggestions.push(
    "What's our current business performance?",
    "Show me today's key metrics",
    "What opportunities should we focus on?",
   );
  }

  return suggestions.slice(0, 3); // Return max 3 suggestions
 }
}

export const aiBusinessIntelligenceService = AIBusinessIntelligenceService.getInstance();
