interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface TaskCommand {
  type:
    | "task"
    | "meeting"
    | "reminder"
    | "note"
    | "complete"
    | "delete"
    | "unknown";
  title: string;
  description?: string;
  date?: string;
  time?: string;
  frequency?: string;
  priority?: "urgent" | "high" | "medium" | "low";
  targetId?: string; // For complete/delete operations
}

const GEMINI_API_KEY = "AIzaSyDpHIsbZ5agfx3tvA3VHjo7SuS6m1CEOcc";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export class GeminiService {
  static async parseVoiceCommand(transcript: string): Promise<TaskCommand> {
    const prompt = `
Parse this voice command and extract structured task information. Return ONLY a JSON object with these fields:

{
  "type": "task" | "meeting" | "reminder" | "note" | "complete" | "delete" | "unknown",
  "title": "main task title",
  "description": "optional description",
  "date": "YYYY-MM-DD format if mentioned",
  "time": "HH:MM format if mentioned",
  "frequency": "daily|weekly|monthly if recurring",
  "priority": "urgent|high|medium|low based on urgency words",
  "targetId": "task id if completing/deleting specific task"
}

Voice command: "${transcript}"

Examples:
- "Remind me to call Riya at 6 PM" → {"type": "reminder", "title": "Call Riya", "time": "18:00", "priority": "medium"}
- "Add task review quarterly report urgent" → {"type": "task", "title": "Review quarterly report", "priority": "urgent"}
- "Schedule meeting with team tomorrow at 9 AM" → {"type": "meeting", "title": "Meeting with team", "date": "tomorrow", "time": "09:00", "priority": "medium"}
- "Mark task complete" → {"type": "complete", "title": "Mark task complete"}
- "Delete the last task" → {"type": "delete", "title": "Delete task"}
- "Add note about project ideas" → {"type": "note", "title": "Project ideas", "priority": "low"}

Return ONLY the JSON object, no other text.
`;

    try {
      const response = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = text.match(/\{.*\}/s);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]) as TaskCommand;

      // Process relative dates
      if (parsed.date) {
        parsed.date = this.processRelativeDate(parsed.date);
      }

      return parsed;
    } catch (error) {
      console.error("Error parsing voice command:", error);

      // Fallback parsing for common patterns
      return this.fallbackParse(transcript);
    }
  }

  private static processRelativeDate(dateStr: string): string {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    switch (dateStr.toLowerCase()) {
      case "today":
        return today.toISOString().split("T")[0];
      case "tomorrow":
        return tomorrow.toISOString().split("T")[0];
      default:
        // Try to parse as date string
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split("T")[0];
        }
        return dateStr;
    }
  }

  private static fallbackParse(transcript: string): TaskCommand {
    const lower = transcript.toLowerCase();

    // Determine type
    let type: TaskCommand["type"] = "task";
    if (lower.includes("remind") || lower.includes("reminder")) {
      type = "reminder";
    } else if (lower.includes("meeting") || lower.includes("meet")) {
      type = "meeting";
    } else if (lower.includes("note")) {
      type = "note";
    } else if (
      lower.includes("complete") ||
      lower.includes("done") ||
      lower.includes("finish")
    ) {
      type = "complete";
    } else if (lower.includes("delete") || lower.includes("remove")) {
      type = "delete";
    }

    // Extract priority
    let priority: TaskCommand["priority"] = "medium";
    if (
      lower.includes("urgent") ||
      lower.includes("asap") ||
      lower.includes("immediately")
    ) {
      priority = "urgent";
    } else if (lower.includes("important") || lower.includes("high")) {
      priority = "high";
    } else if (lower.includes("low") || lower.includes("later")) {
      priority = "low";
    }

    // Clean up title
    let title = transcript;
    const removeWords = [
      "add",
      "task",
      "remind",
      "me",
      "to",
      "schedule",
      "meeting",
      "with",
    ];
    removeWords.forEach((word) => {
      title = title.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
    });
    title = title.trim().replace(/\s+/g, " ");

    return {
      type,
      title: title || "New task",
      priority,
    };
  }
}
