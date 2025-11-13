import express from "express";
import { dealerGPTService } from "../services/dealerGPTService";
import { aiMemoryService } from "../services/aiMemoryService";
import { requireAuth } from "../auth";

const router = express.Router();

// Get startup greeting
router.get("/api/dealergpt/greeting", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const greeting = await dealerGPTService.getStartupGreeting(userId);
  res.json(greeting);
 } catch (error) {
  console.error("Error getting startup greeting:", error);
  res.status(500).json({
   message: "Failed to get startup greeting",
   error: error.message,
  });
 }
});

// Process conversation
router.post("/api/dealergpt/conversation", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { message, sessionId, context } = req.body;

  if (!message || typeof message !== "string") {
   return res.status(400).json({ message: "Message is required" });
  }

  const response = await dealerGPTService.processConversation({
   message,
   userId,
   sessionId,
   context,
   timestamp: Date.now(),
  });

  res.json(response);
 } catch (error) {
  console.error("Error processing conversation:", error);
  res.status(500).json({
   message: "Failed to process conversation",
   error: error.message,
  });
 }
});

// Get conversation history
router.get("/api/dealergpt/history", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { sessionId, limit = 50 } = req.query;

  const history = await aiMemoryService.getConversationHistory(
   userId,
   sessionId as string,
   parseInt(limit as string),
  );

  res.json(history);
 } catch (error) {
  console.error("Error getting conversation history:", error);
  res.status(500).json({
   message: "Failed to get conversation history",
   error: error.message,
  });
 }
});

// Get active insights
router.get("/api/dealergpt/insights", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { limit = 10 } = req.query;

  const insights = await aiMemoryService.getActiveInsights(userId, parseInt(limit as string));

  res.json(insights);
 } catch (error) {
  console.error("Error getting active insights:", error);
  res.status(500).json({
   message: "Failed to get active insights",
   error: error.message,
  });
 }
});

// Acknowledge insight
router.post("/api/dealergpt/insights/:id/acknowledge", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const insightId = parseInt(req.params.id);
  if (!insightId) {
   return res.status(400).json({ message: "Invalid insight ID" });
  }

  await aiMemoryService.acknowledgeInsight(insightId, userId);
  res.json({ message: "Insight acknowledged successfully" });
 } catch (error) {
  console.error("Error acknowledging insight:", error);
  res.status(500).json({
   message: "Failed to acknowledge insight",
   error: error.message,
  });
 }
});

// Get user memory
router.get("/api/dealergpt/memory", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { type, limit = 20 } = req.query;

  let memories;
  if (type) {
   memories = await aiMemoryService.getByType(type as string, parseInt(limit as string));
  } else {
   memories = await aiMemoryService.getByUser(userId, parseInt(limit as string));
  }

  res.json(memories);
 } catch (error) {
  console.error("Error getting user memory:", error);
  res.status(500).json({
   message: "Failed to get user memory",
   error: error.message,
  });
 }
});

// Search memory
router.get("/api/dealergpt/memory/search", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { query, limit = 10 } = req.query;

  if (!query || typeof query !== "string") {
   return res.status(400).json({ message: "Search query is required" });
  }

  const results = await aiMemoryService.search(query, parseInt(limit as string));
  res.json(results);
 } catch (error) {
  console.error("Error searching memory:", error);
  res.status(500).json({
   message: "Failed to search memory",
   error: error.message,
  });
 }
});

// Save memory entry
router.post("/api/dealergpt/memory", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { key, data, memory_type, entity_type, entity_id, priority, tags, relevance_score, expires_at } =
   req.body;

  if (!key || !data || !memory_type) {
   return res.status(400).json({ message: "Key, data, and memory_type are required" });
  }

  await aiMemoryService.save({
   key,
   data,
   memory_type,
   entity_type,
   entity_id,
   user_id: userId,
   priority,
   tags,
   relevance_score,
   expires_at: expires_at ? new Date(expires_at) : undefined,
  });

  res.json({ message: "Memory saved successfully" });
 } catch (error) {
  console.error("Error saving memory:", error);
  res.status(500).json({
   message: "Failed to save memory",
   error: error.message,
  });
 }
});

// Provide user feedback on response
router.post("/api/dealergpt/feedback", requireAuth, async (req, res) => {
 try {
  const userId = req.user?.id;
  if (!userId) {
   return res.status(401).json({ message: "User not authenticated" });
  }

  const { conversationId, feedback } = req.body;

  if (!conversationId || !feedback) {
   return res.status(400).json({ message: "Conversation ID and feedback are required" });
  }

  // Store feedback in memory for learning
  await aiMemoryService.save({
   key: `feedback@${conversationId}`,
   data: {
    conversation_id: conversationId,
    feedback,
    user_id: userId,
    timestamp: new Date(),
   },
   memory_type: "interaction",
   entity_type: "conversation",
   entity_id: conversationId,
   user_id: userId,
   priority: "normal",
   tags: ["feedback", "conversation_quality"],
  });

  res.json({ message: "Feedback saved successfully" });
 } catch (error) {
  console.error("Error saving feedback:", error);
  res.status(500).json({
   message: "Failed to save feedback",
   error: error.message,
  });
 }
});

// Get DealerGPT capabilities
router.get("/api/dealergpt/capabilities", requireAuth, async (req, res) => {
 try {
  const capabilities = {
   core_features: [
    "Real-time dealership data analysis",
    "Contextual conversation memory",
    "Proactive insights and recommendations",
    "Adaptive learning from interactions",
    "Multi-module integration (inventory, sales, customers, leads)",
    "Intelligent business intelligence",
    "Automated alert system",
    "Performance trend analysis",
   ],
   data_sources: [
    "Vehicle inventory and sales data",
    "Customer relationship management",
    "Lead pipeline and conversion tracking",
    "Financial performance metrics",
    "Job scheduling and logistics",
    "User interaction history",
    "Business intelligence reports",
   ],
   interaction_types: [
    "Natural language queries",
    "Proactive recommendations",
    "Alert acknowledgment",
    "Contextual follow-up suggestions",
    "Memory-based conversations",
    "Performance insights",
    "Trend analysis",
    "Actionable business intelligence",
   ],
   example_queries: [
    "What needs my immediate attention today?",
    "Show me our best and worst performing inventory",
    "Which customers should I follow up with?",
    "What are our sales trends this month?",
    "Give me actionable recommendations for increasing revenue",
    "What vehicles have been in stock too long?",
    "Show me our lead conversion opportunities",
    "What patterns do you see in our business?",
   ],
  };

  res.json(capabilities);
 } catch (error) {
  console.error("Error getting capabilities:", error);
  res.status(500).json({
   message: "Failed to get capabilities",
   error: error.message,
  });
 }
});

// Prune old memory entries (admin only)
router.post("/api/dealergpt/memory/prune", requireAuth, async (req, res) => {
 try {
  const userRole = req.user?.role;
  if (userRole !== "admin") {
   return res.status(403).json({ message: "Admin access required" });
  }

  const { days = 90 } = req.body;

  await aiMemoryService.prune(days);
  res.json({ message: "Memory pruning completed successfully" });
 } catch (error) {
  console.error("Error pruning memory:", error);
  res.status(500).json({
   message: "Failed to prune memory",
   error: error.message,
  });
 }
});

// Integration health check endpoint
router.get("/api/dealergpt/health", requireAuth, async (req, res) => {
 try {
  const healthStatus = await dealerGPTService.performIntegrationHealthCheck();
  res.json(healthStatus);
 } catch (error) {
  console.error("Health check error:", error);
  res.status(500).json({
   overall_status: "unhealthy",
   error: error.message,
   timestamp: new Date(),
  });
 }
});

// Enhanced data retrieval with validation
router.get("/api/dealergpt/data-status", requireAuth, async (req, res) => {
 try {
  const validatedData = await dealerGPTService.fetchDealershipDataWithValidation();
  res.json({
   status: "success",
   data_integrity: validatedData._metadata?.data_integrity || "unknown",
   fetch_time: validatedData._metadata?.fetch_time || 0,
   validation_results: validatedData._metadata?.validation_results || {},
   timestamp: new Date(),
  });
 } catch (error) {
  console.error("Data status error:", error);
  res.status(500).json({
   status: "error",
   error: error.message,
   timestamp: new Date(),
  });
 }
});

// Test mode endpoint for sandbox verification
router.post("/api/dealergpt/test-mode", requireAuth, async (req, res) => {
 try {
  const { test_query } = req.body;

  // Run in test mode with enhanced error handling
  const testResponse = await dealerGPTService.processConversation({
   message: `[TEST MODE] ${test_query}`,
   userId: req.user.id,
   context: { test_mode: true },
  });

  res.json({
   status: "test_completed",
   response: testResponse,
   timestamp: new Date(),
  });
 } catch (error) {
  console.error("Test mode error:", error);
  res.status(500).json({
   status: "test_failed",
   error: error.message,
   timestamp: new Date(),
  });
 }
});

export default router;
