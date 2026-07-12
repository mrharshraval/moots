import { Capability } from "./capabilities.js";

export type RevealMechanism = 'MUTUAL_CONSENT' | 'UNILATERAL' | 'DISABLED';
export type RetentionType   = 'EPHEMERAL' | 'PERSISTENT' | 'TIMED';

export interface ConversationPolicy {
  id:      string;
  name:    string;   // 'anonymous_stranger' | 'icebreaker' | 'identified_dm'
  version: number;   // policies are versioned, never mutated

  retentionPolicy: {
    type:          RetentionType;
    ttlSeconds:    number | null;  // null = forever
    deleteOnLeave: boolean;
  };

  capabilities: Set<Capability>;
}
