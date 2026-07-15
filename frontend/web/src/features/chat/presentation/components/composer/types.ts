export type ComposerState =
  | "empty"       // Initial state, no text
  | "idle"        // Focused but no text
  | "typing"      // User is actively typing (single line)
  | "multiline"   // Text has wrapped to multiple lines
  | "reply"       // Replying to a specific message
  | "edit"        // Editing an existing message
  | "attachments" // File attached
  | "recording"   // Voice memo active
  | "sending"     // Send triggered, awaiting response
  | "error"       // Send failed
  | "disabled"    // Chat is locked
