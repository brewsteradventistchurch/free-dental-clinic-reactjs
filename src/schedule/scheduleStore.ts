import {
  appointments as initialAppointments,
  providerAvailability as initialProviderAvailability,
  providers as initialProviders,
  services as initialServices,
} from "./mockScheduleData";
import type { Appointment, Provider, ProviderAvailability, ServiceType } from "./types";

const STORAGE_KEY = "free-dental-clinic-schedule-v2";

type ScheduleStore = {
  services: ServiceType[];
  providers: Provider[];
  providerAvailability: ProviderAvailability[];
  appointments: Appointment[];
};

const initialStore: ScheduleStore = {
  services: initialServices,
  providers: initialProviders,
  providerAvailability: initialProviderAvailability,
  appointments: initialAppointments,
};

function normalizeAvailability(
  entries: Array<Partial<ProviderAvailability> & { providerId: string; date: string; startMinutes: number; endMinutes: number }>,
): ProviderAvailability[] {
  return entries.map((entry, index) => ({
    id: entry.id ?? `availability-${entry.providerId}-${entry.date}-${entry.startMinutes}-${entry.endMinutes}-${index}`,
    providerId: entry.providerId,
    date: entry.date,
    startMinutes: entry.startMinutes,
    endMinutes: entry.endMinutes,
  }));
}

function readStore(): ScheduleStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(initialStore);

    const parsed = JSON.parse(raw) as Partial<ScheduleStore>;

    return {
      services: parsed.services ?? initialStore.services,
      providers: parsed.providers ?? initialStore.providers,
      providerAvailability: parsed.providerAvailability
        ? normalizeAvailability(parsed.providerAvailability)
        : initialStore.providerAvailability,
      appointments: parsed.appointments ?? initialStore.appointments,
    };
  } catch {
    return structuredClone(initialStore);
  }
}

export function getScheduleStore(): ScheduleStore {
  return readStore();
}

export function saveScheduleStore(store: ScheduleStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetScheduleStore(): void {
  saveScheduleStore(structuredClone(initialStore));
}