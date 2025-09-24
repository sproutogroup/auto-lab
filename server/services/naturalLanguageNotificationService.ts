import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface ParsedNotificationRule {
 trigger: string;
 condition?: string;
 action: string;
 priority: string;
 recipients: string[];
 message_template?: string;
 confidence: number;
}

interface NotificationRuleRequest {
 prompt: string;
}

export class NaturalLanguageNotificationService {
 private triggerMappings = {
  lead: "lead_created",
  customer: "customer_created",
  vehicle: "vehicle_added",
  appointment: "appointment_scheduled",
  sale: "sale_completed",
  task: "task_overdue",
  inventory: "inventory_low",
  performance: "performance_alert",
  interaction: "interaction_needed",
 };

 private recipientMappings = {
  "sales team": ["sales_team"],
  managers: ["managers"],
  admin: ["admin"],
  me: ["current_user"],
  everyone: ["all_users"],
  salesperson: ["assigned_salesperson"],
 };

 async parseNotificationRule(
  request: NotificationRuleRequest
 ): Promise<ParsedNotificationRule> {
  try {
   const prompt = `
        Analyze this notification request and extract the key components:
        "${request.prompt}"
        
        Available triggers: ${Object.values(this.triggerMappings).join(", ")}
        Available recipients: ${Object.keys(this.recipientMappings).join(", ")}
        
        Extract and return JSON with:
        - trigger: main event type (from available triggers)
        - condition: any specific conditions mentioned
        - action: what should happen
        - priority: high, medium, or low
        - recipients: who should be notified (array)
        - message_template: suggested notification message
        - confidence: confidence score 0-1
        
        Examples:
        "Send a notification when a lead is created" → trigger: "lead_created", recipients: ["current_user"]
        "Alert the sales team when an appointment is scheduled" → trigger: "appointment_scheduled", recipients: ["sales_team"]
        "Notify managers when a high-value lead is added" → trigger: "lead_created", condition: "high_value", recipients: ["managers"]
      `;

   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content:
       "You are a notification rule parser. Extract structured data from natural language notification requests and return valid JSON.",
     },
     {
      role: "user",
      content: prompt,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
   });

   const result = JSON.parse(response.choices[0].message.content || "{}");

   // Validate and normalize the result
   return this.validateAndNormalizeRule(result);
  } catch (error) {
   console.error(
    "OpenAI API error, falling back to rule-based parsing:",
    error
   );

   // Fallback to rule-based parsing
   try {
    return this.parseWithRules(request.prompt);
   } catch (fallbackError) {
    console.error("Fallback parsing failed:", fallbackError);
    // Return default rule as last resort
    return {
     trigger: "lead_created",
     condition: undefined,
     action: "Send notification",
     priority: "medium",
     recipients: ["managers"],
     message_template: "New notification requires attention",
     confidence: 0.5,
    };
   }
  }
 }

 private parseWithRules(prompt: string): ParsedNotificationRule {
  if (!prompt || typeof prompt !== "string") {
   throw new Error("Invalid prompt provided");
  }
  const lowercasePrompt = prompt.toLowerCase();

  // Detect trigger
  let trigger = "lead_created"; // default
  let priority = "medium";
  let recipients = ["current_user"];
  let confidence = 0.7;

  // Trigger detection patterns
  if (
   lowercasePrompt.includes("lead") &&
   (lowercasePrompt.includes("created") || lowercasePrompt.includes("new"))
  ) {
   trigger = "lead_created";
   recipients = ["current_user"];
  } else if (
   lowercasePrompt.includes("vehicle") &&
   (lowercasePrompt.includes("added") || lowercasePrompt.includes("new"))
  ) {
   trigger = "vehicle_added";
   recipients = ["current_user"];
  } else if (
   lowercasePrompt.includes("sale") &&
   (lowercasePrompt.includes("completed") || lowercasePrompt.includes("sold"))
  ) {
   trigger = "sale_completed";
   recipients = ["current_user"];
  } else if (
   lowercasePrompt.includes("inventory") &&
   lowercasePrompt.includes("low")
  ) {
   trigger = "inventory_low";
   recipients = ["current_user"];
   priority = "high";
  } else if (
   lowercasePrompt.includes("appointment") &&
   (lowercasePrompt.includes("scheduled") || lowercasePrompt.includes("booked"))
  ) {
   trigger = "appointment_scheduled";
   recipients = ["current_user"];
  } else if (
   lowercasePrompt.includes("task") &&
   (lowercasePrompt.includes("overdue") || lowercasePrompt.includes("late"))
  ) {
   trigger = "task_overdue";
   recipients = ["current_user"];
   priority = "high";
  } else if (
   lowercasePrompt.includes("customer") &&
   (lowercasePrompt.includes("follow") || lowercasePrompt.includes("reminder"))
  ) {
   trigger = "customer_follow_up";
   recipients = ["current_user"];
  } else if (
   lowercasePrompt.includes("payment") &&
   (lowercasePrompt.includes("received") || lowercasePrompt.includes("paid"))
  ) {
   trigger = "payment_received";
   recipients = ["current_user"];
  }

  // Priority detection (normalize to valid values)
  if (
   lowercasePrompt.includes("urgent") ||
   lowercasePrompt.includes("immediately")
  ) {
   priority = "high"; // map urgent to high since only high/medium/low are valid
   confidence = 0.8;
  } else if (
   lowercasePrompt.includes("critical") ||
   lowercasePrompt.includes("emergency")
  ) {
   priority = "high"; // map critical to high since only high/medium/low are valid
   confidence = 0.8;
  } else if (
   lowercasePrompt.includes("high") ||
   lowercasePrompt.includes("important")
  ) {
   priority = "high";
   confidence = 0.8;
  } else if (
   lowercasePrompt.includes("low") ||
   lowercasePrompt.includes("minor")
  ) {
   priority = "low";
   confidence = 0.8;
  }

  // Recipient detection
  if (
   lowercasePrompt.includes("sales team") ||
   lowercasePrompt.includes("salespeople")
  ) {
   recipients = ["sales_team"];
  } else if (
   lowercasePrompt.includes("managers") ||
   lowercasePrompt.includes("management")
  ) {
   recipients = ["managers"];
  } else if (
   lowercasePrompt.includes("everyone") ||
   lowercasePrompt.includes("all")
  ) {
   recipients = ["all_users"];
  } else if (
   lowercasePrompt.includes("me") ||
   lowercasePrompt.includes("myself")
  ) {
   recipients = ["current_user"];
  }

  // Generate message template
  const triggerName = trigger.replace("_", " ");
  const messageTemplate = `${
   triggerName.charAt(0).toUpperCase() + triggerName.slice(1)
  } notification - please review and take appropriate action`;

  return {
   trigger,
   condition: undefined,
   action: `Send notification about ${triggerName}`,
   priority,
   recipients,
   message_template: messageTemplate,
   confidence,
  };
 }

 async generateNotificationMessage(
  trigger: string,
  entityData: any
 ): Promise<string> {
  try {
   const prompt = `
        Generate a professional notification message for a luxury car dealership.
        
        Trigger: ${trigger}
        Entity data: ${JSON.stringify(entityData)}
        
        Create a concise, professional message that:
        - Clearly states what happened
        - Includes relevant details
        - Suggests appropriate action
        - Maintains luxury brand tone
        
        Return only the message text, no JSON.
      `;

   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content:
       "You are a professional notification message generator for a luxury automotive dealership. Create concise, actionable messages.",
     },
     {
      role: "user",
      content: prompt,
     },
    ],
    temperature: 0.7,
    max_tokens: 150,
   });

   return (
    response.choices[0].message.content?.trim() ||
    "New event requires attention"
   );
  } catch (error) {
   console.error("Error generating notification message:", error);
   return "New event requires attention";
  }
 }

 async suggestNotificationRules(context: string): Promise<string[]> {
  try {
   const prompt = `
        Based on this dealership context: "${context}"
        
        Suggest 5-8 practical notification rules that would be useful for a luxury car dealership.
        
        Format each as a natural language statement like:
        - "Send a notification when a lead is created"
        - "Alert the sales team when an appointment is scheduled"
        
        Focus on:
        - Lead management
        - Sales process
        - Customer service
        - Inventory management
        - Performance monitoring
        
        Return as JSON array of strings.
      `;

   const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
     {
      role: "system",
      content:
       "You are a business process consultant for luxury car dealerships. Suggest practical notification rules.",
     },
     {
      role: "user",
      content: prompt,
     },
    ],
    response_format: { type: "json_object" },
    temperature: 0.8,
   });

   const result = JSON.parse(
    response.choices[0].message.content || '{"suggestions": []}'
   );
   return result.suggestions || [];
  } catch (error) {
   console.error("Error suggesting notification rules:", error);
   return [];
  }
 }

 private validateAndNormalizeRule(rule: any): ParsedNotificationRule {
  // Normalize trigger
  const normalizedTrigger = this.findTriggerMatch(rule.trigger || "");

  // Normalize recipients
  const normalizedRecipients = this.normalizeRecipients(rule.recipients || []);

  // Validate priority
  const validPriorities = ["high", "medium", "low"];
  const normalizedPriority = validPriorities.includes(
   rule.priority?.toLowerCase()
  )
   ? rule.priority.toLowerCase()
   : "medium";

  // Ensure confidence is between 0 and 1
  const confidence = Math.min(Math.max(rule.confidence || 0.7, 0), 1);

  return {
   trigger: normalizedTrigger,
   condition: rule.condition || undefined,
   action: rule.action || "send_notification",
   priority: normalizedPriority,
   recipients: normalizedRecipients,
   message_template: rule.message_template || undefined,
   confidence,
  };
 }

 private findTriggerMatch(trigger: string): string {
  const lowerTrigger = trigger.toLowerCase();

  // Direct match
  if (Object.values(this.triggerMappings).includes(lowerTrigger)) {
   return lowerTrigger;
  }

  // Partial match
  for (const [key, value] of Object.entries(this.triggerMappings)) {
   if (lowerTrigger.includes(key) || lowerTrigger.includes(value)) {
    return value;
   }
  }

  return "lead_created"; // Default fallback
 }

 private normalizeRecipients(recipients: any[]): string[] {
  if (!Array.isArray(recipients)) {
   return ["current_user"];
  }

  const normalized: string[] = [];

  for (const recipient of recipients) {
   const lowerRecipient = recipient.toString().toLowerCase();
   const mapped =
    this.recipientMappings[
     lowerRecipient as keyof typeof this.recipientMappings
    ];

   if (mapped) {
    normalized.push(...mapped);
   } else {
    normalized.push(recipient);
   }
  }

  return normalized.length > 0 ? normalized : ["current_user"];
 }
}

export const naturalLanguageNotificationService =
 new NaturalLanguageNotificationService();
