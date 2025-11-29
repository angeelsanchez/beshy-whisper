import type { LucideIcon } from 'lucide-react';
import {
  Smile,
  Leaf,
  Heart,
  Zap,
  Frown,
  AlertTriangle,
  Moon,
  Flame,
  Sun,
  Calendar,
  Dumbbell,
  Droplet,
  BedDouble,
  Footprints,
  Brain,
  BookOpen,
  PenLine,
  GraduationCap,
  Code,
  Languages,
  Timer,
  TreePine,
  Activity,
  Sparkles,
  Phone,
  Palette,
  Pen,
  Music,
  Target,
  Star,
  CheckCircle,
  Users,
  HeartHandshake,
  Sprout,
  Hand,
  MonitorOff,
  AlertCircle,
} from 'lucide-react';

export const MOOD_ICON_MAP: Record<string, LucideIcon> = {
  feliz: Smile,
  tranquilo: Leaf,
  agradecido: Heart,
  energetico: Zap,
  triste: Frown,
  ansioso: AlertTriangle,
  cansado: Moon,
  frustrado: Flame,
};

export const HABIT_ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  droplet: Droplet,
  'bed-double': BedDouble,
  footprints: Footprints,
  brain: Brain,
  'book-open': BookOpen,
  'pen-line': PenLine,
  heart: Heart,
  'graduation-cap': GraduationCap,
  code: Code,
  languages: Languages,
  timer: Timer,
  'tree-pine': TreePine,
  activity: Activity,
  sparkles: Sparkles,
  'monitor-off': MonitorOff,
  phone: Phone,
  'heart-handshake': HeartHandshake,
  palette: Palette,
  pen: Pen,
  music: Music,
  target: Target,
  star: Star,
  flame: Flame,
  'check-circle': CheckCircle,
  moon: Moon,
  sun: Sun,
  calendar: Calendar,
  'alert-circle': AlertCircle,
  sprout: Sprout,
  hand: Hand,
  users: Users,
  leaf: Leaf,
};

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  brain: Brain,
  'book-open': BookOpen,
  leaf: Leaf,
  users: Users,
  palette: Palette,
};

export const EMOJI_TO_ICON_ID: Record<string, string> = {
  '\uD83D\uDCAA': 'dumbbell',    // 💪
  '\uD83D\uDCA7': 'droplet',     // 💧
  '\uD83C\uDFCB\uFE0F': 'dumbbell', // 🏋️
  '\uD83C\uDFCB': 'dumbbell',    // 🏋 (without VS16)
  '\uD83E\uDDD8': 'brain',       // 🧘
  '\uD83D\uDCD6': 'book-open',   // 📖
  '\uD83D\uDCDD': 'pen-line',    // 📝
  '\uD83D\uDE4F': 'heart',       // 🙏
  '\uD83D\uDCDA': 'graduation-cap', // 📚
  '\uD83D\uDCBB': 'code',        // 💻
  '\uD83D\uDDE3\uFE0F': 'languages', // 🗣️
  '\uD83D\uDDE3': 'languages',   // 🗣 (without VS16)
  '\u23F1\uFE0F': 'timer',       // ⏱️
  '\u23F1': 'timer',             // ⏱ (without VS16)
  '\uD83C\uDF33': 'tree-pine',   // 🌳
  '\uD83E\uDD38': 'activity',    // 🤸
  '\uD83E\uDDF9': 'sparkles',    // 🧹
  '\uD83D\uDCF5': 'monitor-off', // 📵
  '\uD83D\uDCDE': 'phone',       // 📞
  '\u2764\uFE0F': 'heart-handshake', // ❤️
  '\u2764': 'heart-handshake',   // ❤ (without VS16)
  '\uD83C\uDFA8': 'palette',     // 🎨
  '\u270D\uFE0F': 'pen',         // ✍️
  '\u270D': 'pen',               // ✍ (without VS16)
  '\uD83C\uDFB5': 'music',       // 🎵
  '\uD83D\uDEB6': 'footprints',  // 🚶
  '\uD83D\uDE34': 'bed-double',  // 😴
  '\uD83C\uDFAF': 'target',      // 🎯
  '\u2B50': 'star',              // ⭐
  '\uD83D\uDD25': 'flame',       // 🔥
  '\u2705': 'check-circle',      // ✅
  '\uD83E\uDDE0': 'brain',       // 🧠
  '\uD83C\uDF3F': 'leaf',        // 🌿
  '\uD83D\uDC65': 'users',       // 👥
  '\uD83D\uDCCA': 'activity',    // 📊
};

export function resolveIcon(
  identifier: string,
  type: 'habit' | 'mood' | 'category' = 'habit',
): LucideIcon | null {
  const map = type === 'mood'
    ? MOOD_ICON_MAP
    : type === 'category'
      ? CATEGORY_ICON_MAP
      : HABIT_ICON_MAP;

  const direct = map[identifier];
  if (direct) return direct;

  const mappedId = EMOJI_TO_ICON_ID[identifier];
  if (mappedId) {
    return HABIT_ICON_MAP[mappedId] ?? null;
  }

  return null;
}
