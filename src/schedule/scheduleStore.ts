import {
  appointments as initialAppointments,
  bookingStatuses as initialBookingStatuses,
  followUpInterests as initialFollowUpInterests,
  patients as initialPatients,
  preferredLanguages as initialPreferredLanguages,
  providerAvailability as initialProviderAvailability,
  providers as initialProviders,
  requestSources as initialRequestSources,
  services as initialServices,
} from "./mockScheduleData";

import type {
  Appointment,
  BookingStatus,
  FollowUpInterest,
  Patient,
  Provider,
  ProviderAvailability,
  RequestSource,
  ServiceType,
} from "./types";

const STORAGE_KEY = "free-dental-clinic-schedule-v3";

export type RegistrationConfig = {
  bookingStatuses: BookingStatus[];
  requestSources: RequestSource[];
  followUpInterests: FollowUpInterest[];
  preferredLanguages: string[];
};

type ScheduleStore = {
  services: ServiceType[];
  providers: Provider[];
  providerAvailability: ProviderAvailability[];
  appointments: Appointment[];

  patients: Patient[];

  bookingStatuses: string[];
  requestSources: string[];
  preferredLanguages: string[];
  followUpInterests: string[];
};

// const DEFAULT_REGISTRATION_CONFIG: RegistrationConfig = {
//   bookingStatuses: [
//     "Booked",
//     "Declined",
//     "Walk-in - Day of Clinic",
//     "Follow Up - Needed",
//     "Waiting List - Ready",
//     "Walk-In - Arranged",
//     "Duplicate",
//     "First Call - Needed",
//     "First Call - V/M Left",
//     "Follow Up - V/M Left",
//     "Waiting List - Priority",
//   ],

//   requestSources: [
//     "Voicemail Message",
//     "Email Message",
//     "Family Member",
//     "Walk-in",
//     "Omak 2024 Clinic",
//     "Friend",
//     "Text Message",
//   ],

//   followUpInterests: [
//     "Bible studies",
//     "Walking club",
//     "Cooking for the holidays",
//     "Dinner with the doctor",
//     "Nutrition classes",
//   ],

//   preferredLanguages: [
//     "English",
//     "Spanish",
//   ],
//};

const initialStore: ScheduleStore = {
  services: initialServices,
  providers: initialProviders,
  providerAvailability: initialProviderAvailability,
  appointments: initialAppointments,

  patients: initialPatients,

  bookingStatuses: initialBookingStatuses,
  requestSources: initialRequestSources,
  preferredLanguages: initialPreferredLanguages,
  followUpInterests: initialFollowUpInterests,
};

function normalizeAvailability(
  entries: Array<
    Partial<ProviderAvailability> & {
      providerId: string;
      date: string;
      startMinutes: number;
      endMinutes: number;
    }
  >,
): ProviderAvailability[] {
  return entries.map((entry, index) => ({
    id:
      entry.id ??
      `availability-${entry.providerId}-${entry.date}-${entry.startMinutes}-${entry.endMinutes}-${index}`,
    providerId: entry.providerId,
    date: entry.date,
    startMinutes: entry.startMinutes,
    endMinutes: entry.endMinutes,
  }));
}

// function normalizePatient(
//   patient: Partial<Patient> & {
//     id: string;
//     firstName: string;
//     lastName: string;
//   },
// ): Patient {
//   const now = new Date().toISOString();

//   return {
//     id: patient.id,
//     firstName: patient.firstName,
//     lastName: patient.lastName,

//     dateOfBirth: patient.dateOfBirth,

//     email: patient.email,
//     cellPhone: patient.cellPhone ?? "",
//     alternatePhone: patient.alternatePhone,

//     preferredLanguage: patient.preferredLanguage ?? "English",
//     needsTranslator: patient.needsTranslator ?? false,

//     streetAddress: patient.streetAddress,
//     streetCity: patient.streetCity,
//     streetState: patient.streetState,
//     streetZip: patient.streetZip,

//     mailingAddress: patient.mailingAddress,
//     mailingCity: patient.mailingCity,
//     mailingState: patient.mailingState,
//     mailingZip: patient.mailingZip,

//     spouseOrParentName: patient.spouseOrParentName,
//     referral: patient.referral,

//     bookingStatus: patient.bookingStatus ?? "First Call - Needed",
//     sourceOfRequest: patient.sourceOfRequest ?? "Walk-in",
//     requestDate: patient.requestDate ?? now,

//     serviceRequested: patient.serviceRequested,

//     followUpInterests: patient.followUpInterests ?? [],

//     noteLogs: patient.noteLogs ?? [],

//     createdAt: patient.createdAt ?? now,
//     updatedAt: patient.updatedAt ?? now,
//   };
//}

function readStore(): ScheduleStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return structuredClone(initialStore);
    }

    const parsed = JSON.parse(raw) as Partial<ScheduleStore>;

    return {
      services: parsed.services ?? initialStore.services,
      providers: parsed.providers ?? initialStore.providers,
      providerAvailability: parsed.providerAvailability
        ? normalizeAvailability(parsed.providerAvailability)
        : initialStore.providerAvailability,
      appointments: parsed.appointments ?? initialStore.appointments,

      patients: parsed.patients ?? initialStore.patients,

      bookingStatuses:
        parsed.bookingStatuses ?? initialStore.bookingStatuses,

      requestSources:
        parsed.requestSources ?? initialStore.requestSources,

      preferredLanguages:
        parsed.preferredLanguages ?? initialStore.preferredLanguages,

      followUpInterests:
        parsed.followUpInterests ?? initialStore.followUpInterests,
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

export function getNextPatientId(patients: Patient[]): string {
  const numericIds = patients
    .map((patient) => Number.parseInt(patient.id, 10))
    .filter((id) => Number.isFinite(id));

  const nextId = numericIds.length
    ? Math.max(...numericIds) + 1
    : 1;

  return String(nextId).padStart(3, "0");
}