export interface Initiative {
  readonly id: string;
  readonly creator_id: string;
  readonly name: string;
  readonly description: string;
  readonly icon: string | null;
  readonly color: string;
  readonly category: 'health' | 'mind' | 'productivity' | 'wellness' | 'social' | 'creativity' | null;
  readonly tracking_type: 'binary' | 'quantity' | 'timer';
  readonly target_value: number | null;
  readonly unit: string | null;
  readonly start_date: string;
  readonly end_date: string | null;
  readonly max_participants: number | null;
  readonly participant_count: number;
  readonly is_active: boolean;
  readonly reminder_time: string | null;
  readonly community_streak: number;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface InitiativeListItem extends Initiative {
  readonly is_joined: boolean;
  readonly today_completed: boolean;
  readonly today_completion_rate: number;
}

export interface InitiativeParticipant {
  readonly user_id: string;
  readonly name: string | null;
  readonly alias: string | null;
  readonly profile_photo_url: string | null;
  readonly joined_at: string;
  readonly checked_in_today: boolean;
  readonly personal_streak: number;
}

export interface InitiativeDailyProgress {
  readonly date: string;
  readonly completed_count: number;
  readonly total_participants: number;
  readonly completion_rate: number;
}

export interface InitiativeProgress {
  readonly today: InitiativeDailyProgress;
  readonly weekly: ReadonlyArray<InitiativeDailyProgress>;
  readonly community_streak: number;
  readonly total_days: number;
  readonly days_completed: number;
}

export interface InitiativeCheckinResult {
  readonly action: 'checked_in' | 'updated' | 'removed';
  readonly completed: boolean;
  readonly date: string;
  readonly value: number | null;
  readonly community_progress: {
    readonly completed_count: number;
    readonly total_participants: number;
    readonly completion_rate: number;
    readonly is_perfect_day: boolean;
  };
  readonly milestone: { readonly type: string; readonly message: string } | null;
}
