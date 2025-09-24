import { Router } from "express";
import { aiBusinessIntelligenceService } from "../services/aiBusinessIntelligenceService";
import { storage } from "../storage";

const router = Router();

// Quick query endpoint for common questions
router.post("/api/ai/quick-query", async (req, res) => {
  try {
    const { query } = req.body;

    // Handle specific queries with direct data access for speed
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes("how many vehicles") ||
      lowerQuery.includes("inventory count")
    ) {
      const stats = await storage.getDashboardStats();
      return res.json({
        message: `We currently have ${stats.stockSummary.totalVehicles} vehicles in stock with a total value of £${stats.stockSummary.totalValue.toLocaleString()}. This includes ${stats.stockSummary.uniqueMakes} different makes.`,
        data: stats.stockSummary,
        suggestions: [
          "Show me the breakdown by make",
          "What's our oldest stock?",
          "Which vehicles arrived this week?",
        ],
      });
    }

    if (
      lowerQuery.includes("sales today") ||
      lowerQuery.includes("today sales")
    ) {
      const stats = await storage.getDashboardStats();
      const todaySales = await storage.getTodaySales();
      return res.json({
        message: `Today we've sold ${todaySales.count} vehicles for a total of £${todaySales.revenue.toLocaleString()} with a gross profit of £${todaySales.profit.toLocaleString()}.`,
        data: todaySales,
        suggestions: [
          "Compare with yesterday's sales",
          "Show me this week's performance",
          "Who were the top performers today?",
        ],
      });
    }

    if (
      lowerQuery.includes("top selling") ||
      lowerQuery.includes("best selling")
    ) {
      const vehicles = await storage.getVehicles({
        status: "SOLD",
        limit: 10,
        orderBy: "sale_date",
        order: "desc",
      });

      const topMakes = vehicles.reduce((acc, v) => {
        acc[v.make] = (acc[v.make] || 0) + 1;
        return acc;
      }, {});

      const sortedMakes = Object.entries(topMakes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      return res.json({
        message: `Our top selling makes recently are: ${sortedMakes.map(([make, count]) => `${make} (${count} units)`).join(", ")}.`,
        data: { topMakes: sortedMakes, recentSales: vehicles.length },
        suggestions: [
          "Show me profit margins by make",
          "What's our average sale price?",
          "Which models sell fastest?",
        ],
      });
    }

    // For other queries, fall back to AI
    return res.status(400).json({
      error: "Query not recognized for quick response",
      fallback: true,
    });
  } catch (error) {
    console.error("Quick query error:", error);
    res.status(500).json({ error: "Failed to process quick query" });
  }
});

// Main AI conversation endpoint
router.post("/api/ai/conversation", async (req, res) => {
  try {
    console.log("Processing AI conversation request:", {
      message: req.body.message,
      hasContext: !!req.body.context,
      historyLength: req.body.conversationHistory?.length || 0,
    });

    const response = await aiBusinessIntelligenceService.processConversation({
      message: req.body.message,
      context: req.body.context,
      conversation_history: req.body.conversationHistory,
    });

    console.log("AI conversation response generated:", {
      messageLength: response.message.length,
      contextUsed: response.context_used.length,
    });

    res.json(response);
  } catch (error) {
    console.error("AI conversation error:", error);
    res.status(500).json({
      error: error.message || "Failed to process AI conversation",
      message:
        "I apologize, but I'm having trouble accessing the data right now. Please try again in a moment.",
      suggestions: [
        "Try a simpler question",
        "Ask about specific metrics",
        "Check your connection",
      ],
    });
  }
});

// Get AI capabilities endpoint
router.get("/api/ai/capabilities", async (req, res) => {
  res.json({
    capabilities: [
      "Real-time inventory analysis",
      "Sales performance tracking",
      "Customer relationship insights",
      "Lead conversion analytics",
      "Financial reporting",
      "Predictive analytics",
      "Natural language queries",
    ],
    exampleQueries: [
      "What's our current inventory status?",
      "Show me this month's sales performance",
      "Which vehicles have been in stock longest?",
      "What's our lead conversion rate?",
      "Who are our top customers?",
      "Analyze our profit margins",
    ],
  });
});

export default router;
