// Interfacce scritte a mano che rispecchiano i modelli Pydantic (backend/models/*.py).

export type Storage = "frigo" | "dispensa" | "freezer";
export type ItemStatus = "attivo" | "consumato" | "buttato";
export type Urgency = "rosso" | "giallo" | "verde";

export interface CategoryInfo {
  key: string;
  label: string;
  days_frigo: number | null;
  days_dispensa: number | null;
  days_freezer: number | null;
  days_after_opening: number;
  default_storage: Storage;
}

export interface ParseRequest {
  image_base64?: string | null;
  text?: string | null;
}

export interface ParsedLine {
  raw_text: string;
  name: string;
  category: string;
  storage: Storage;
  quantity: string;
  price: number | null;
  is_food: boolean;
  confidence: "alta" | "media" | "bassa";
  from_memory: boolean;
}

export interface ParsedReceipt {
  store: string | null;
  purchase_date: string;
  lines: ParsedLine[];
}

export interface ItemInput {
  name: string;
  raw_text?: string;
  category: string;
  storage: Storage;
  quantity?: string;
  price?: number | null;
  purchase_date?: string | null;
  expiry_date?: string | null;
  opened?: boolean;
}

export interface ConfirmRequest {
  items: ItemInput[];
  remember: boolean;
}

export interface ItemUpdate {
  status?: ItemStatus;
  opened?: boolean;
  storage?: Storage;
  expiry_date?: string;
  clear_expiry?: boolean;
}

export interface PantryItem {
  id: string;
  name: string;
  raw_text: string;
  category: string;
  storage: Storage;
  quantity: string;
  price: number | null;
  purchase_date: string;
  expiry_date: string | null;
  opened: boolean;
  opened_at: string | null;
  status: ItemStatus;
  created_at: string;
  category_label: string;
  use_by: string;
  days_left: number;
  urgency: Urgency;
  source: "etichetta" | "stima" | "stima_apertura";
}

export interface Alias {
  key: string;
  raw_text: string;
  name: string;
  category: string;
  storage: Storage;
}

export interface ResetResult {
  removed: number;
  aliases_kept: number;
}

export interface Stats {
  active: number;
  consumed: number;
  thrown: number;
  urgent: number;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  pantry_item_id: string | null;
}

export interface Recipe {
  id: string;
  date: string;
  title: string;
  minutes: number;
  servings: number;
  why: string;
  health_notes: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  cooked: boolean;
  created_at: string;
}

export interface CookRequest {
  item_ids: string[];
}

export interface MorningSummary {
  date: string;
  urgent: PantryItem[];
  recipes: Recipe[];
  message: string;
}

export interface TelegramSettings {
  configured: boolean;
  enabled: boolean;
  chat_id: string;
  token_hint: string;
  send_time: string;
  last_sent_date: string | null;
}

export interface TelegramSettingsInput {
  bot_token?: string | null;
  chat_id?: string | null;
  enabled: boolean;
  send_time: string;
}

export interface SendResult {
  ok: boolean;
  detail: string;
}
