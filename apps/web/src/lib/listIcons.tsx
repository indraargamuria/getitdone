import type { LucideIcon } from "lucide-react";
import {
  Beer,
  BookOpen,
  Briefcase,
  Car,
  Clapperboard,
  Code2,
  Coffee,
  Dumbbell,
  Flag,
  Footprints,
  Gamepad2,
  GraduationCap,
  Heart,
  House,
  KeyRound,
  Leaf,
  Map as MapIcon,
  MoonStar,
  Music,
  Package,
  PenLine,
  Plane,
  ShoppingCart,
  Star,
  Stethoscope,
  Sun,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";

export const PALETTE = [
  "#E2502E",
  "#E08A00",
  "#2F7A6D",
  "#5B6EE8",
  "#8A5BC8",
  "#C85B8A",
  "#4A8A5B",
  "#6F6959",
];

export interface ListIconDef {
  key: string;
  label: string;
  color: string;
  Icon: LucideIcon;
}

export const LIST_ICONS: ListIconDef[] = [
  { key: "star", label: "Star", color: "#F5A623", Icon: Star },
  { key: "book", label: "Book", color: "#5B6EE8", Icon: BookOpen },
  { key: "cart", label: "Shopping", color: "#E2502E", Icon: ShoppingCart },
  { key: "gym", label: "Fitness", color: "#E84A5F", Icon: Dumbbell },
  { key: "heart", label: "Health", color: "#E84A5F", Icon: Heart },
  { key: "plane", label: "Travel", color: "#2F7A6D", Icon: Plane },
  { key: "home", label: "Home", color: "#8A5BC8", Icon: House },
  { key: "code", label: "Coding", color: "#2E7DE8", Icon: Code2 },
  { key: "moon", label: "Night", color: "#5B6EE8", Icon: MoonStar },
  { key: "sun", label: "Sun", color: "#F5A623", Icon: Sun },
  { key: "leaf", label: "Nature", color: "#4A8A5B", Icon: Leaf },
  { key: "music", label: "Music", color: "#C85B8A", Icon: Music },
  { key: "truck", label: "Delivery", color: "#E08A00", Icon: Truck },
  { key: "box", label: "Pack", color: "#6F6959", Icon: Package },
  { key: "flag", label: "Goal", color: "#E2502E", Icon: Flag },
  { key: "key", label: "Keys", color: "#C89B3C", Icon: KeyRound },
  { key: "map", label: "Places", color: "#2F7A6D", Icon: MapIcon },
  { key: "beer", label: "Social", color: "#F5A623", Icon: Beer },
  { key: "zap", label: "Energy", color: "#F5C518", Icon: Zap },
  { key: "money", label: "Money", color: "#4A8A5B", Icon: Wallet },
  { key: "med", label: "Medical", color: "#E84A5F", Icon: Stethoscope },
  { key: "pen", label: "Writing", color: "#5B6EE8", Icon: PenLine },
  { key: "cup", label: "Coffee", color: "#8A5BC8", Icon: Coffee },
  { key: "game", label: "Games", color: "#E2502E", Icon: Gamepad2 },
  { key: "car", label: "Car", color: "#4A8A5B", Icon: Car },
  { key: "walk", label: "Walk", color: "#2E7DE8", Icon: Footprints },
  { key: "film", label: "Film", color: "#C85B8A", Icon: Clapperboard },
  { key: "study", label: "Study", color: "#2F7A6D", Icon: GraduationCap },
  { key: "work", label: "Work", color: "#5B6EE8", Icon: Briefcase },
];

const ICON_MAP = new Map<string, ListIconDef>(LIST_ICONS.map((d) => [d.key, d]));

export function listIconDef(key: string | null | undefined): ListIconDef | undefined {
  return key ? ICON_MAP.get(key) : undefined;
}

export function ListIconGlyph({
  icon,
  className,
}: {
  icon: string | null | undefined;
  className?: string;
}) {
  const def = listIconDef(icon);
  if (!def) return null;
  const I = def.Icon;
  return <I className={className} strokeWidth={2} aria-hidden />;
}
