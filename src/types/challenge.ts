export interface Challenge {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly theme: string | null;
  readonly start_date: string;
  readonly end_date: string;
  readonly is_active: boolean;
  readonly created_at: string;
  readonly participant_count?: number;
}

export interface ChallengeEntry {
  readonly challenge_id: string;
  readonly entry_id: string;
  readonly user_id: string;
  readonly created_at: string;
}

export interface ActiveChallengeResponse {
  readonly challenge: Challenge | null;
  readonly participantCount: number;
  readonly userParticipating: boolean;
}
