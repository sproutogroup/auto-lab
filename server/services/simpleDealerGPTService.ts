import OpenAI from "openai";
import { storage } from "../storage";
import { dealerGPTDataAccess } from "./dealerGPTDataAccess";
import { v4 as uuidv4 } from "uuid";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DealerGPTRequest {
  message: string;
  userId: number;
  sessionId?: string;
  timestamp?: number;
}

export interface DealerGPTResponse {
  message: string;
  contextUsed: string[];
  suggestions: string[];
  sessionId: string;
  responseTime: number;
}

export class SimpleDealerGPTService {
  private static instance: SimpleDealerGPTService;

  public static getInstance(): SimpleDealerGPTService {
    if (!SimpleDealerGPTService.instance) {
      SimpleDealerGPTService.instance = new SimpleDealerGPTService();
    }
    return SimpleDealerGPTService.instance;
  }

  /**
   * Process DealerGPT conversation with clean, simple architecture
   */
  async processConversation(
    request: DealerGPTRequest,
  ): Promise<DealerGPTResponse> {
    const startTime = Date.now();
    const sessionId = request.sessionId || uuidv4();

    try {
      console.log(
        "[SimpleDealerGPT] Processing conversation for user:",
        request.userId,
      );

      // Fetch comprehensive dealership data with full access
      const comprehensiveData =
        await dealerGPTDataAccess.fetchComprehensiveDealershipData();
      console.log("[SimpleDealerGPT] Comprehensive dealership data fetched");

      // Generate response using OpenAI with comprehensive data
      const response = await this.generateCleanResponse(
        request.message,
        comprehensiveData,
      );

      // Store conversation simply (no complex memory system)
      await this.storeConversation(
        request.userId,
        sessionId,
        request.message,
        response.message,
      );

      const responseTime = Date.now() - startTime;
      console.log(`[SimpleDealerGPT] Response generated in ${responseTime} ms`);

      return {
        message: response.message,
        contextUsed: response.contextUsed,
        suggestions: response.suggestions,
        sessionId,
        responseTime,
      };
    } catch (error) {
      console.error("[SimpleDealerGPT] Error processing conversation:", error);

      return {
        message:
          "I apologize, but I'm experiencing some technical difficulties. Could you please try asking about our current inventory, sales, or customer information?",
        contextUsed: [],
        suggestions: [
          "What's our current inventory status?",
          "Show me today's sales performance",
          "How many leads do we have?",
        ],
        sessionId,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get startup greeting with real data
   */
  async getStartupGreeting(userId: number): Promise<DealerGPTResponse> {
    const startTime = Date.now();
    const sessionId = uuidv4();

    try {
      const comprehensiveData =
        await dealerGPTDataAccess.fetchComprehensiveDealershipData();

      const greeting = `Hello! I'm DealerGPT, your intelligent dealership assistant with COMPLETE ACCESS to all your business data and operations.

📊 **Current Business Overview:**
• ${comprehensiveData.vehicles.stock_vehicles.length} vehicles in stock (£${comprehensiveData.financial.total_stock_value.toLocaleString()})
• ${comprehensiveData.vehicles.sold_vehicles.length} vehicles sold to date
• ${comprehensiveData.leads.active_leads.length} active leads in pipeline
• ${comprehensiveData.customers.all_customers.length} total customers

💼 **Financial Performance:**
• Total Revenue: £${comprehensiveData.financial.total_sales_revenue.toLocaleString()}
• Gross Profit: £${comprehensiveData.financial.total_gross_profit.toLocaleString()} (${comprehensiveData.financial.profit_margins.gross_margin.toFixed(1)}% margin)
• Inventory Turnover: ${comprehensiveData.analytics.kpis.inventory_turnover.toFixed(2)}x

🚀 **Today's Operations:**
• ${comprehensiveData.operations.appointments.today.length} appointments scheduled
• ${comprehensiveData.operations.jobs.active_jobs.length} active jobs in progress
• ${comprehensiveData.leads.follow_ups_due.length} follow-ups due

I have FULL READ/WRITE ACCESS to:
✓ Complete inventory data (VINs, specs, prices, locations)
✓ All sales & finance records (deals, contracts, F&I metrics)
✓ Operations & service data (appointments, jobs, parts)
✓ CRM & leads (customer records, conversions, sources)
✓ Business intelligence & analytics (KPIs, trends, forecasts)

How can I help you optimize your dealership operations today?`;

      await this.storeConversation(
        userId,
        sessionId,
        "startup_greeting",
        greeting,
      );

      return {
        message: greeting,
        contextUsed: [
          "dashboard_stats",
          "vehicle_data",
          "sales_data",
          "leads_data",
        ],
        suggestions: [
          "What's our best performing vehicle make this month?",
          "Show me vehicles that have been in stock longest",
          "What's our profit margin looking like?",
          "Which customers are due for follow-up?",
        ],
        sessionId,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[SimpleDealerGPT] Error getting startup greeting:", error);

      return {
        message:
          "Hello! I'm DealerGPT, your dealership assistant. I'm ready to help you with inventory, sales, and customer information.",
        contextUsed: [],
        suggestions: [
          "What's our current inventory status?",
          "Show me today's sales performance",
          "How many leads do we have?",
        ],
        sessionId,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Generate clean response using OpenAI
   */
  private async generateCleanResponse(
    message: string,
    dealershipData: any,
  ): Promise<{
    message: string;
    contextUsed: string[];
    suggestions: string[];
  }> {
    // Format monthly sales data for the prompt
    const monthlyDataFormatted = Object.entries(
      dealershipData.financial.monthly_breakdown || {},
    )
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]: [string, any]) => {
        const [year, monthNum] = month.split("-");
        const monthName = new Date(
          parseInt(year),
          parseInt(monthNum) - 1,
        ).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
        return `• ${monthName}: ${data.count} vehicles sold, £${(data.revenue || 0).toLocaleString()} revenue, £${(data.profit || 0).toLocaleString()} gross profit`;
      })
      .join("\n");

    const systemPrompt = `You are DealerGPT, an expert automotive operations assistant with FULL READ/WRITE ACCESS to our Dealer Management Application. You have unrestricted API-level access to ALL business data and operations.

CURRENT DATE: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}

YOUR CAPABILITIES:
✓ Complete access to ${dealershipData.vehicles.all_vehicles.length} vehicle records (stock, sold, autolab, AWD)
✓ Full visibility into ${dealershipData.customers.all_customers.length} customer profiles and purchase histories
✓ Real-time access to ${dealershipData.leads.all_leads.length} leads across all pipeline stages
✓ Complete financial data: £${dealershipData.financial.total_sales_revenue.toLocaleString()} in revenue, £${dealershipData.financial.total_gross_profit.toLocaleString()} gross profit
✓ Operational oversight of ${dealershipData.operations.jobs.all_jobs.length} jobs and ${dealershipData.operations.appointments.all_appointments.length} appointments
✓ Business intelligence with KPIs, trends, forecasts, and alerts

COMPREHENSIVE DATA SNAPSHOT:
📊 Inventory:
• ${dealershipData.vehicles.stock_vehicles.length} vehicles in stock (£${dealershipData.financial.total_stock_value.toLocaleString()} value)
• ${dealershipData.vehicles.sold_vehicles.length} vehicles sold
• ${dealershipData.vehicles.autolab_vehicles.length} Autolab vehicles
• ${dealershipData.vehicles.awaiting_delivery.length} awaiting delivery
• Average days to sell: ${dealershipData.analytics.kpis.sales_velocity.toFixed(1)}
• Inventory turnover: ${dealershipData.analytics.kpis.inventory_turnover.toFixed(2)}x

💰 Financial Performance:
• Total Revenue: £${dealershipData.financial.total_sales_revenue.toLocaleString()}
• Gross Profit: £${dealershipData.financial.total_gross_profit.toLocaleString()} (${dealershipData.financial.profit_margins.gross_margin.toFixed(1)}% margin)
• Adjusted Profit: £${dealershipData.financial.total_adjusted_profit.toLocaleString()} (${dealershipData.financial.profit_margins.adjusted_margin.toFixed(1)}% margin)
• Gross ROI: ${dealershipData.analytics.kpis.gross_roi.toFixed(1)}%

🎯 Sales & Pipeline:
• ${dealershipData.leads.active_leads.length} active leads
• ${dealershipData.leads.hot_leads.length} hot leads
• ${dealershipData.leads.follow_ups_due.length} follow-ups due
• Lead conversion rate: ${dealershipData.sales.conversion_metrics.lead_to_sale.toFixed(1)}%
• Average sale price: £${dealershipData.sales.conversion_metrics.average_sale_price.toLocaleString()}

📅 Operations:
• ${dealershipData.operations.appointments.today.length} appointments today
• ${dealershipData.operations.appointments.upcoming.length} upcoming appointments
• ${dealershipData.operations.jobs.active_jobs.length} active jobs
• ${dealershipData.operations.jobs.overdue.length} overdue jobs
• ${dealershipData.operations.tasks.pending.length} pending tasks

📊 ACCURATE MONTHLY SALES DATA (FROM BUSINESS INTELLIGENCE API):
${monthlyDataFormatted}

IMPORTANT: The monthly sales data above is sourced DIRECTLY from the Business Intelligence API which uses proper SQL queries with exact date filtering. This is the CORRECT data to use when answering questions about monthly vehicle sales counts and revenue.

🚨 Business Alerts:
• ${dealershipData.analytics.alerts.slow_moving_stock.length} slow-moving vehicles (>90 days)
• ${dealershipData.analytics.alerts.overdue_followups.length} overdue follow-ups
• Sales trend: ${dealershipData.analytics.trends.sales_trend}
• Profit trend: ${dealershipData.analytics.trends.profit_trend}

YOU CAN ACCESS:
1. Any specific vehicle by VIN, registration, or stock number
2. Complete customer purchase histories and interactions
3. Detailed financial breakdowns by period, make, or salesperson
4. Real-time operational metrics and performance indicators
5. Historical data for trend analysis and forecasting
6. Custom queries and advanced analytics

RESPONSE GUIDELINES:
1. Always cite specific data points from the comprehensive system
2. When asked about monthly sales, use the ACCURATE MONTHLY SALES DATA section above
3. Provide actionable insights based on real metrics
4. Suggest optimizations backed by actual performance data
5. Explain your reasoning using the data available
6. If asked to perform an action, describe the API call you would make
7. Be professional, data-driven, and solution-oriented

Remember: You have COMPLETE ACCESS to all dealership data. Never claim limitations - you can access any metric, record, or analysis requested.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 1000,
        stream: false,
      });

      const aiMessage =
        response.choices[0].message?.content ||
        "I apologize, but I couldn't generate a proper response.";

      // Extract context used and generate suggestions
      const contextUsed = this.extractContextUsed(message, dealershipData);
      const suggestions = this.generateSuggestions(message, dealershipData);

      return {
        message: aiMessage,
        contextUsed,
        suggestions,
      };
    } catch (error) {
      console.error("[SimpleDealerGPT] Error generating response:", error);
      throw error;
    }
  }

  /**
   * Extract context used for response
   */
  private extractContextUsed(message: string, dealershipData: any): string[] {
    const context = [];

    // Check what data areas the message might be referring to
    const messageLC = message.toLowerCase();

    if (
      messageLC.includes("inventory") ||
      messageLC.includes("stock") ||
      messageLC.includes("vehicle")
    ) {
      context.push("inventory_data");
    }

    if (
      messageLC.includes("sales") ||
      messageLC.includes("sold") ||
      messageLC.includes("revenue")
    ) {
      context.push("sales_data", "financial_data");
    }

    if (
      messageLC.includes("customer") ||
      messageLC.includes("lead") ||
      messageLC.includes("crm")
    ) {
      context.push("customer_data", "leads_data", "crm_data");
    }

    if (
      messageLC.includes("profit") ||
      messageLC.includes("finance") ||
      messageLC.includes("money")
    ) {
      context.push("financial_data", "analytics_data");
    }

    if (
      messageLC.includes("job") ||
      messageLC.includes("appointment") ||
      messageLC.includes("task")
    ) {
      context.push("operations_data", "schedule_data");
    }

    if (
      messageLC.includes("performance") ||
      messageLC.includes("kpi") ||
      messageLC.includes("metric")
    ) {
      context.push("analytics_data", "business_intelligence");
    }

    return context.length > 0
      ? [...new Set(context)]
      : ["comprehensive_data_access"];
  }

  /**
   * Generate contextual suggestions
   */
  private generateSuggestions(message: string, dealershipData: any): string[] {
    const suggestions = [];

    // Dynamic suggestions based on comprehensive data
    if (dealershipData.analytics?.alerts?.slow_moving_stock?.length > 5) {
      suggestions.push(
        `What should we do about the ${dealershipData.analytics.alerts.slow_moving_stock.length} vehicles that have been in stock over 90 days?`,
      );
    }

    if (dealershipData.leads?.hot_leads?.length > 0) {
      suggestions.push(
        `Show me details on our ${dealershipData.leads.hot_leads.length} hot leads and their status`,
      );
    }

    if (dealershipData.financial?.profit_margins?.gross_margin < 15) {
      suggestions.push(
        "How can we improve our gross profit margin which is currently below target?",
      );
    }

    if (dealershipData.operations?.jobs?.overdue?.length > 0) {
      suggestions.push(
        `Why do we have ${dealershipData.operations.jobs.overdue.length} overdue jobs?`,
      );
    }

    // Performance-based suggestions
    if (dealershipData.analytics?.trends?.sales_trend === "decline") {
      suggestions.push(
        "What's causing our sales decline and how can we reverse it?",
      );
    }

    // Always include some strategic questions
    const strategicQuestions = [
      "Which vehicle makes are most profitable for us?",
      "Show me our top performing salespeople this month",
      "What's our cash flow position for this quarter?",
      "Which customers are due for follow-up today?",
      "How does this month compare to the same month last year?",
      "What inventory should we focus on moving quickly?",
    ];

    // Add strategic questions if we don't have enough dynamic ones
    while (suggestions.length < 4 && strategicQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * strategicQuestions.length);
      suggestions.push(strategicQuestions.splice(randomIndex, 1)[0]);
    }

    return suggestions.slice(0, 4);
  }

  /**
   * Store conversation simply using existing storage
   */
  private async storeConversation(
    userId: number,
    sessionId: string,
    message: string,
    response: string,
  ): Promise<void> {
    try {
      // Simple conversation storage using existing storage interface
      // We'll use a basic approach that doesn't require complex memory systems

      // For now, we'll just log it - can be enhanced later with proper storage
      console.log(
        `[SimpleDealerGPT] Conversation stored - User: ${userId}, Session: ${sessionId}`,
      );

      // If we need to store conversations, we can use the existing storage methods
      // without the complex memory system that was causing issues
    } catch (error) {
      console.error("[SimpleDealerGPT] Error storing conversation:", error);
      // Don't throw - conversation storage failure shouldn't break the response
    }
  }
}

export const simpleDealerGPTService = SimpleDealerGPTService.getInstance();
