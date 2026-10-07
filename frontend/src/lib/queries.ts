import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/lib/api";
import type {
  CategoryInfo, ConfirmRequest, CookRequest, ItemInput, ItemUpdate, MorningSummary, PantryItem, ParseRequest,
  ParsedReceipt, Recipe, ResetResult, SendResult, Stats, TelegramSettings, TelegramSettingsInput, Alias,
} from "@/lib/types";

export const KEYS = {
  pantry: ["pantry"],
  stats: ["pantry-stats"],
  categories: ["categories"],
  recipes: ["recipes-today"],
  summary: ["summary"],
  telegram: ["telegram"],
  aliases: ["aliases"],
};

export const useCategories = () =>
  useQuery({ queryKey: KEYS.categories, queryFn: () => apiGet<CategoryInfo[]>("/categories"), staleTime: Infinity, retry: false });
export const usePantry = () => useQuery({ queryKey: KEYS.pantry, queryFn: () => apiGet<PantryItem[]>("/pantry"), retry: false });
export const useStats = () => useQuery({ queryKey: KEYS.stats, queryFn: () => apiGet<Stats>("/pantry/stats"), retry: false });
export const useRecipes = () => useQuery({ queryKey: KEYS.recipes, queryFn: () => apiGet<Recipe[]>("/recipes/today"), retry: false });
export const useSummary = () => useQuery({ queryKey: KEYS.summary, queryFn: () => apiGet<MorningSummary>("/summary"), retry: false });
export const useTelegram = () =>
  useQuery({ queryKey: KEYS.telegram, queryFn: () => apiGet<TelegramSettings>("/settings/telegram"), retry: false });
export const useAliases = () => useQuery({ queryKey: KEYS.aliases, queryFn: () => apiGet<Alias[]>("/aliases"), retry: false });

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    for (const k of [KEYS.pantry, KEYS.stats, KEYS.recipes, KEYS.summary, KEYS.aliases]) qc.invalidateQueries({ queryKey: k });
  };
}

export const useParseReceipt = () =>
  useMutation({ mutationFn: (req: ParseRequest) => apiPost<ParsedReceipt>("/receipts/parse", req) });

export function useConfirm() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: (req: ConfirmRequest) => apiPost<PantryItem[]>("/pantry/confirm", req), onSuccess: inv });
}

export function useAddItem() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: (req: ItemInput) => apiPost<PantryItem>("/pantry", req), onSuccess: inv });
}

export function useUpdateItem() {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, upd }: { id: string; upd: ItemUpdate }) => apiPatch<PantryItem>(`/pantry/${id}`, upd),
    onSuccess: inv,
  });
}

export function useReset() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: () => apiDelete<ResetResult>("/pantry"), onSuccess: inv });
}

export function useGenerateRecipes() {
  const inv = useInvalidateAll();
  return useMutation({ mutationFn: () => apiPost<Recipe[]>("/recipes/generate"), onSuccess: inv });
}

export function useCook() {
  const inv = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, req }: { id: string; req: CookRequest }) => apiPost<Recipe>(`/recipes/${id}/cook`, req),
    onSuccess: inv,
  });
}

export function useSaveTelegram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: TelegramSettingsInput) => apiPut<TelegramSettings>("/settings/telegram", req),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.telegram }),
  });
}

export const useSendTelegram = () => useMutation({ mutationFn: () => apiPost<SendResult>("/telegram/send") });
