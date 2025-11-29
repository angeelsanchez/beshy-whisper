/**
 * Direct Messages types
 * Used for 1-to-1 chat between users with mutual follow
 */

export interface DirectMessage {
  readonly id: string;
  readonly conversation_id: string;
  readonly sender_id: string;
  readonly content: string;
  readonly read_at: string | null;
  readonly created_at: string;
  readonly sender_name?: string | null;
  readonly sender_alias?: string | null;
  readonly sender_profile_photo_url?: string | null;
}

export interface Conversation {
  readonly id: string;
  readonly user_a_id: string;
  readonly user_b_id: string;
  readonly last_message_at: string;
  readonly created_at: string;
}

export interface ConversationListItem {
  readonly id: string;
  readonly otherUser: {
    readonly id: string;
    readonly name: string | null;
    readonly alias: string;
    readonly profilePhotoUrl: string | null;
  };
  readonly lastMessage: {
    readonly content: string;
    readonly senderId: string;
    readonly createdAt: string;
  } | null;
  readonly unreadCount: number;
  readonly lastMessageAt: string;
}

export interface ConversationParticipant {
  readonly id: string;
  readonly name: string | null;
  readonly alias: string;
  readonly profile_photo_url: string | null;
}
