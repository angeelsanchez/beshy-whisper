export const NOTIFICATION_TYPES = [
  'like',
  'repost',
  'follow',
  'follow_post',
  'chat',
  'dm',
  'reminder_morning',
  'reminder_streak',
  'reminder_night',
  'reminder_habit',
  'initiative_reminder',
  'initiative_weekly',
  'initiative_streak',
  'initiative_checkin',
  'habit_milestone',
  'habit_link_request',
  'habit_link_response',
  'habit_link_completion',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationTypeConfig {
  readonly type: NotificationType;
  readonly label: string;
  readonly description: string;
}

export interface NotificationCategory {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly icon: string;
  readonly types: ReadonlyArray<NotificationTypeConfig>;
}

export const NOTIFICATION_CATEGORIES: ReadonlyArray<NotificationCategory> = [
  {
    id: 'social',
    label: 'Social',
    description: 'Interacciones con otros usuarios',
    icon: 'Users',
    types: [
      { type: 'like', label: 'Likes', description: 'Cuando alguien da like a tu whisper' },
      { type: 'repost', label: 'Reposts', description: 'Cuando alguien repostea tu whisper' },
      { type: 'follow', label: 'Nuevos seguidores', description: 'Cuando alguien te sigue' },
      { type: 'follow_post', label: 'Publicaciones de seguidos', description: 'Cuando alguien que sigues publica' },
      { type: 'chat', label: 'Mensajes de grupo', description: 'Mensajes en chats de iniciativas' },
      { type: 'dm', label: 'Mensajes directos', description: 'Cuando recibes un mensaje directo' },
    ],
  },
  {
    id: 'reminders',
    label: 'Recordatorios',
    description: 'Recordatorios para escribir tus whispers',
    icon: 'Bell',
    types: [
      { type: 'reminder_morning', label: 'Recordatorio matutino', description: 'A las 10:00 si no has publicado' },
      { type: 'reminder_streak', label: 'Alerta de racha', description: 'Entre las 15:00 y 18:00 si tu racha est\u00e1 en riesgo' },
      { type: 'reminder_night', label: 'Recordatorio nocturno', description: 'A las 21:30 si no has publicado' },
      { type: 'reminder_habit', label: 'Recordatorio de h\u00e1bitos', description: 'A la hora configurada por h\u00e1bito' },
    ],
  },
  {
    id: 'initiatives',
    label: 'Iniciativas',
    description: 'Actividad de iniciativas comunitarias',
    icon: 'Flag',
    types: [
      { type: 'initiative_reminder', label: 'Recordatorio diario', description: 'Recordatorio de check-in diario' },
      { type: 'initiative_weekly', label: 'Resumen semanal', description: 'Resumen de progreso los domingos' },
      { type: 'initiative_streak', label: 'Racha comunitaria', description: 'Hitos de racha del equipo (7, 14, 21...)' },
      { type: 'initiative_checkin', label: 'Hitos de completitud', description: 'Cuando el equipo alcanza 50%, 75%, 100%' },
    ],
  },
  {
    id: 'achievements',
    label: 'Logros',
    description: 'Hitos de h\u00e1bitos y progreso personal',
    icon: 'Trophy',
    types: [
      { type: 'habit_milestone', label: 'Hitos de h\u00e1bitos', description: 'Al alcanzar 21, 66 repeticiones o retomas' },
    ],
  },
  {
    id: 'habit_links',
    label: 'H\u00e1bitos compartidos',
    description: 'Vinculaci\u00f3n de h\u00e1bitos con otras personas',
    icon: 'Link',
    types: [
      { type: 'habit_link_request', label: 'Solicitudes de v\u00ednculo', description: 'Cuando alguien quiere vincular un h\u00e1bito contigo' },
      { type: 'habit_link_response', label: 'Respuestas a solicitudes', description: 'Cuando responden a tu solicitud de v\u00ednculo' },
      { type: 'habit_link_completion', label: 'Completado del compa\u00f1ero', description: 'Cuando tu compa\u00f1ero completa el h\u00e1bito vinculado' },
    ],
  },
];
