export enum Capability {
  // Identity
  REVEAL_IDENTITY           = 'REVEAL_IDENTITY',
  REQUEST_REVEAL            = 'REQUEST_REVEAL',

  // Messaging
  SEND_TEXT                 = 'SEND_TEXT',
  SEND_MEDIA                = 'SEND_MEDIA',
  SEND_VOICE_NOTE           = 'SEND_VOICE_NOTE',
  DELETE_OWN_MESSAGE        = 'DELETE_OWN_MESSAGE',
  DELETE_ANY_MESSAGE        = 'DELETE_ANY_MESSAGE',  // moderator only

  // Connections
  CREATE_CONNECTION         = 'CREATE_CONNECTION',
  VIEW_PARTICIPANT_PROFILE  = 'VIEW_PARTICIPANT_PROFILE',

  // Real-time
  VOICE_CALL                = 'VOICE_CALL',
  VIDEO_CALL                = 'VIDEO_CALL',
  SCREEN_SHARE              = 'SCREEN_SHARE',

  // Recording & retention
  RECORD_CALL               = 'RECORD_CALL',
  EXPORT_HISTORY            = 'EXPORT_HISTORY',
}
