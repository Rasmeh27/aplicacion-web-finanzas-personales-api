import { create } from 'zustand';
import { subscriptionService } from '@/features/subscription/services/subscription.service';
import type { MySubscription } from '@/features/subscription/types';

/**
 * Estado de suscripción SOLO en memoria (no se persiste a propósito):
 * el plan se re-consulta al backend para no depender de un `isPremium`
 * obsoleto guardado durante el login. `refresh()` se invoca al entrar en
 * Configuración e Inversiones y desde el sidebar.
 */
type SubscriptionState = {
  subscription: MySubscription | null;
  loading: boolean;
  error: boolean;
  fetchedAt: number | null;
  /** Refresca desde la API. Con force=false reutiliza un dato de < 60s. */
  refresh: (options?: { force?: boolean }) => Promise<void>;
  clear: () => void;
};

const FRESH_MS = 60_000;

let inFlight: Promise<void> | null = null;

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  subscription: null,
  loading: false,
  error: false,
  fetchedAt: null,

  refresh: async ({ force = false } = {}) => {
    const { fetchedAt } = get();
    const isFresh = fetchedAt !== null && Date.now() - fetchedAt < FRESH_MS;
    if (!force && isFresh) return;
    if (inFlight) return inFlight;

    set({ loading: true });
    inFlight = subscriptionService
      .getMySubscription()
      .then((subscription) => {
        set({ subscription, error: false, fetchedAt: Date.now() });
      })
      .catch(() => {
        // Fallback seguro: ante error se conserva el último dato conocido
        // (o null => tratado como basic en la UI); nunca se asume premium.
        set({ error: true });
      })
      .finally(() => {
        set({ loading: false });
        inFlight = null;
      });
    return inFlight;
  },

  clear: () => set({ subscription: null, loading: false, error: false, fetchedAt: null }),
}));

/** Selector de conveniencia: true solo si el backend confirmó premium. */
export const selectIsPremium = (state: SubscriptionState): boolean =>
  state.subscription?.plan === 'premium';
