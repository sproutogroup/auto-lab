import express from "express";
import { requireAuth } from "../auth";
import { simpleDealerGPTService } from "../services/simpleDealerGPTService";

const router = express.Router();

// Get startup greeting
router.get("/api/dealergpt/greeting", requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const greeting = await simpleDealerGPTService.getStartupGreeting(userId);
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

    const { message, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "Message is required" });
    }

    const response = await simpleDealerGPTService.processConversation({
      message,
      userId,
      sessionId,
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

export default router;
