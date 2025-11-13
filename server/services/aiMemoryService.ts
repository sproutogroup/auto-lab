import { storage } from "../storage";
import { eq, and, desc, asc, inArray, like, or, gt, lt, isNull, sql } from "drizzle-orm";
import { ai_memory, ai_conversations, ai_insights } from "../../shared/schema";

export interface MemoryEntry {
 key: string;
 data: any;
 memory_type: "user_preference" | "interaction" | "decision" | "pattern" | "alert";
 entity_type?: string;
 entity_id?: number;
 user_id?: number;
 priority?: "low" | "normal" | "high" | "critical";
 tags?: string[];
 relevance_score?: number;
 expires_at?: Date;
}

export interface ConversationEntry {
 user_id: number;
 session_id: string;
 message: string;
 response: string;
 context_used: string[];
 response_time?: number;
 feedback?: string;
}

export interface InsightEntry {
 insight_type: "alert" | "recommendation" | "pattern" | "forecast";
 title: string;
 description: string;
 data?: any;
 priority?: "low" | "medium" | "high" | "urgent";
 category: "inventory" | "sales" | "customers" | "leads" | "finance";
 target_users?: number[];
 conditions?: any;
 expires_at?: Date;
}

export class AIMemoryService {
 private static instance: AIMemoryService;

 public static getInstance(): AIMemoryService {
  if (!AIMemoryService.instance) {
   AIMemoryService.instance = new AIMemoryService();
  }
  return AIMemoryService.instance;
 }

 /**
  * Store memory entry
  */
 async save(entry: MemoryEntry): Promise<void> {
  try {
   await storage
    .getDb()
    .insert(ai_memory)
    .values({
     key: entry.key,
     data: entry.data,
     memory_type: entry.memory_type,
     entity_type: entry.entity_type,
     entity_id: entry.entity_id,
     user_id: entry.user_id,
     priority: entry.priority || "normal",
     tags: entry.tags || [],
     relevance_score: entry.relevance_score || 1.0,
     expires_at: entry.expires_at,
    })
    .onConflictDoUpdate({
     target: ai_memory.key,
     set: {
      data: entry.data,
      memory_type: entry.memory_type,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      user_id: entry.user_id,
      priority: entry.priority || "normal",
      tags: entry.tags || [],
      relevance_score: entry.relevance_score || 1.0,
      expires_at: entry.expires_at,
      updated_at: new Date(),
     },
    });
  } catch (error) {
   console.error("Error saving memory entry:", error);
   throw error;
  }
 }

 /**
  * Search memory by topic or keywords
  */
 async search(query: string, limit = 10): Promise<any[]> {
  try {
   const searchTerms = query.toLowerCase().split(" ");
   const db = storage.db;

   // Search by key, entity type, or tags
   const results = await db
    .select()
    .from(ai_memory)
    .where(
     and(
      or(
       ...searchTerms.map(term =>
        or(
         like(ai_memory.key, `%${term}%`),
         like(ai_memory.entity_type, `%${term}%`),
         // Note: PostgreSQL array contains operator would be better here
         like(ai_memory.tags, `%${term}%`),
        ),
       ),
      ),
      or(isNull(ai_memory.expires_at), gt(ai_memory.expires_at, new Date())),
     ),
    )
    .orderBy(desc(ai_memory.relevance_score), desc(ai_memory.created_at))
    .limit(limit);

   return results;
  } catch (error) {
   console.error("Error searching memory:", error);
   return [];
  }
 }

 /**
  * Get memory entries by type
  */
 async getByType(type: string, limit = 20): Promise<any[]> {
  try {
   const db = storage.db;

   const results = await db
    .select()
    .from(ai_memory)
    .where(
     and(
      eq(ai_memory.memory_type, type),
      or(isNull(ai_memory.expires_at), gt(ai_memory.expires_at, new Date())),
     ),
    )
    .orderBy(desc(ai_memory.relevance_score), desc(ai_memory.created_at))
    .limit(limit);

   return results;
  } catch (error) {
   console.error("Error getting memory by type:", error);
   return [];
  }
 }

 /**
  * Get memory entries for a specific user
  */
 async getByUser(userId: number, limit = 20): Promise<any[]> {
  try {
   const db = storage.db;

   const results = await db
    .select()
    .from(ai_memory)
    .where(
     and(
      eq(ai_memory.user_id, userId),
      or(isNull(ai_memory.expires_at), gt(ai_memory.expires_at, new Date())),
     ),
    )
    .orderBy(desc(ai_memory.relevance_score), desc(ai_memory.created_at))
    .limit(limit);

   return results;
  } catch (error) {
   console.error("Error getting memory by user:", error);
   return [];
  }
 }

 /**
  * Store conversation entry
  */
 async saveConversation(entry: ConversationEntry): Promise<void> {
  try {
   await storage.db.insert(ai_conversations).values({
    user_id: entry.user_id,
    session_id: entry.session_id,
    message: entry.message,
    response: entry.response,
    context_used: entry.context_used,
    response_time: entry.response_time,
    feedback: entry.feedback,
   });
  } catch (error) {
   console.error("Error saving conversation:", error);
   throw error;
  }
 }

 /**
  * Get conversation history for a user
  */
 async getConversationHistory(userId: number, sessionId?: string, limit = 50): Promise<any[]> {
  try {
   const db = storage.db;

   let query = db.select().from(ai_conversations).where(eq(ai_conversations.user_id, userId));

   if (sessionId) {
    query = query.where(eq(ai_conversations.session_id, sessionId));
   }

   const results = await query.orderBy(desc(ai_conversations.created_at)).limit(limit);

   return results;
  } catch (error) {
   console.error("Error getting conversation history:", error);
   return [];
  }
 }

 /**
  * Create insight
  */
 async createInsight(entry: InsightEntry): Promise<void> {
  try {
   await storage.db.insert(ai_insights).values({
    insight_type: entry.insight_type,
    title: entry.title,
    description: entry.description,
    data: entry.data,
    priority: entry.priority || "medium",
    category: entry.category,
    target_users: entry.target_users && entry.target_users.length > 0 ? entry.target_users : null,
    conditions: entry.conditions,
    expires_at: entry.expires_at,
   });
  } catch (error) {
   console.error("Error creating insight:", error);
   throw error;
  }
 }

 /**
  * Get active insights
  */
 async getActiveInsights(userId?: number, limit = 10): Promise<any[]> {
  try {
   const db = storage.db;

   let query = db
    .select()
    .from(ai_insights)
    .where(
     and(
      eq(ai_insights.is_active, true),
      eq(ai_insights.is_acknowledged, false),
      or(isNull(ai_insights.expires_at), gt(ai_insights.expires_at, new Date())),
     ),
    );

   // If userId is provided, filter by target_users
   if (userId) {
    // Use SQL raw query to handle array operations properly
    query = query.where(
     or(
      isNull(ai_insights.target_users),
      // Using PostgreSQL array contains operator
      sql`${ai_insights.target_users} @> ARRAY[${userId}]::integer[]`,
     ),
    );
   }

   const results = await query
    .orderBy(
     asc(ai_insights.priority), // Higher priority first
     desc(ai_insights.created_at),
    )
    .limit(limit);

   return results;
  } catch (error) {
   console.error("Error getting active insights:", error);
   return [];
  }
 }

 /**
  * Acknowledge insight
  */
 async acknowledgeInsight(insightId: number, userId: number): Promise<void> {
  try {
   await storage.db
    .update(ai_insights)
    .set({
     is_acknowledged: true,
     acknowledged_by: userId,
     acknowledged_at: new Date(),
    })
    .where(eq(ai_insights.id, insightId));
  } catch (error) {
   console.error("Error acknowledging insight:", error);
   throw error;
  }
 }

 /**
  * Prune old memory entries
  */
 async prune(daysOld = 90): Promise<void> {
  try {
   const cutoffDate = new Date();
   cutoffDate.setDate(cutoffDate.getDate() - daysOld);

   const db = storage.db;

   // Delete expired entries
   await db.delete(ai_memory).where(
    and(
     lt(ai_memory.created_at, cutoffDate),
     // Don't delete high-priority entries
     eq(ai_memory.priority, "low"),
    ),
   );

   // Delete old conversations (keep high-priority ones)
   await db.delete(ai_conversations).where(lt(ai_conversations.created_at, cutoffDate));

   // Delete old acknowledged insights
   await db
    .delete(ai_insights)
    .where(and(lt(ai_insights.created_at, cutoffDate), eq(ai_insights.is_acknowledged, true)));

   console.log("Memory pruning completed");
  } catch (error) {
   console.error("Error pruning memory:", error);
   throw error;
  }
 }

 /**
  * Get recent user interactions for context
  */
 async getRecentUserContext(userId: number, limit = 10): Promise<any> {
  try {
   const [memories, conversations, insights] = await Promise.all([
    this.getByUser(userId, limit),
    this.getConversationHistory(userId, undefined, limit),
    this.getActiveInsights(userId, limit),
   ]);

   return {
    memories,
    conversations,
    insights,
    summary: {
     totalMemories: memories.length,
     totalConversations: conversations.length,
     activeInsights: insights.length,
    },
   };
  } catch (error) {
   console.error("Error getting recent user context:", error);
   return {
    memories: [],
    conversations: [],
    insights: [],
    summary: {
     totalMemories: 0,
     totalConversations: 0,
     activeInsights: 0,
    },
   };
  }
 }
}

export const aiMemoryService = AIMemoryService.getInstance();
