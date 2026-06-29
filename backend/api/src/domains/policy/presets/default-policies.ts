import { Capability } from "../constants/capabilities.js";
import { ConversationPolicy } from "../types/conversation-policy.types.js";

export const POLICIES: Record<string, ConversationPolicy> = {

  ANONYMOUS_STRANGER: {
    id: 'policy_anon_stranger_v1',
    name: 'anonymous_stranger',
    version: 1,
    identityPolicy: {
      defaultState:    'ANONYMOUS',
      revealMechanism: 'MUTUAL_CONSENT',
      revealExpiry:    86400,  // 24h to respond
    },
    retentionPolicy: {
      type:          'PERSISTENT',
      ttlSeconds:    null,
      deleteOnLeave: false,
    },
    capabilities: new Set([
      Capability.SEND_TEXT,
      Capability.SEND_MEDIA,
      Capability.SEND_VOICE_NOTE,
      Capability.REQUEST_REVEAL,
      Capability.REVEAL_IDENTITY,
      Capability.CREATE_CONNECTION,
      Capability.DELETE_OWN_MESSAGE,
    ]),
  },

  ICEBREAKER: {
    id: 'policy_icebreaker_v1',
    name: 'icebreaker',
    version: 1,
    identityPolicy: {
      defaultState:    'ANONYMOUS',
      revealMechanism: 'DISABLED',  // cannot reveal
      revealExpiry:    null,
    },
    retentionPolicy: {
      type:          'EPHEMERAL',
      ttlSeconds:    3600,  // 1h, then gone
      deleteOnLeave: true,
    },
    capabilities: new Set([
      Capability.SEND_TEXT,  // text only
    ]),
  },

  IDENTIFIED_DM: {
    id: 'policy_identified_dm_v1',
    name: 'identified_dm',
    version: 1,
    identityPolicy: {
      defaultState:    'REVEALED',
      revealMechanism: 'UNILATERAL',
      revealExpiry:    null,
    },
    retentionPolicy: {
      type:          'PERSISTENT',
      ttlSeconds:    null,
      deleteOnLeave: false,
    },
    capabilities: new Set([
      Capability.SEND_TEXT,
      Capability.SEND_MEDIA,
      Capability.SEND_VOICE_NOTE,
      Capability.VOICE_CALL,
      Capability.VIDEO_CALL,
      Capability.VIEW_PARTICIPANT_PROFILE,
      Capability.DELETE_OWN_MESSAGE,
      Capability.EXPORT_HISTORY,
    ]),
  },

  GUEST_DM: {
    id: 'policy_guest_dm_v1',
    name: 'guest_dm',
    version: 1,
    identityPolicy: {
      defaultState:    'ANONYMOUS',
      revealMechanism: 'DISABLED',
      revealExpiry:    null,
    },
    retentionPolicy: {
      type:          'EPHEMERAL',
      ttlSeconds:    86400, // 24 hours
      deleteOnLeave: true,
    },
    capabilities: new Set([
      Capability.SEND_TEXT,
    ]),
  }
};
