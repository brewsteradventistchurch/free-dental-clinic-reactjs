import type {
  Appointment,
  Patient,
  Provider,
  ProviderAvailability,
  ServiceType,
} from "./types";

export const services: ServiceType[] = [
  { id: "cleaning", name: "Cleaning", defaultDurationMinutes: 60 },
  { id: "extraction", name: "Extraction", defaultDurationMinutes: 40 },
  { id: "filling", name: "Filling", defaultDurationMinutes: 60 },
];

export const providers: Provider[] = [
  {
    id: "provider-1",
    name: "Maria Smith",
    title: "Dentist",
    serviceIds: ["cleaning", "extraction"],
  },
  {
    id: "provider-2",
    name: "John Garcia",
    title: "Dentist",
    serviceIds: ["extraction"],
  },
  {
    id: "provider-3",
    name: "Sarah Williams",
    title: "Dentist",
    serviceIds: ["cleaning", "extraction", "filling"],
  },
];

export const patients: Patient[] = [
  { id: "patient-1", firstName: "Maria", lastName: "Garcia" },
  { id: "patient-2", firstName: "Robert", lastName: "Martinez" },
  { id: "patient-3", firstName: "James", lastName: "Wilson" },
  { id: "patient-4", firstName: "Ana", lastName: "Rodriguez" },
  { id: "patient-5", firstName: "David", lastName: "Anderson" },
];

export const providerAvailability: ProviderAvailability[] = [
  {
    id: "availability-1",
    providerId: "provider-1",
    date: "2026-08-21",
    startMinutes: 480,
    endMinutes: 960,
  },
  {
    id: "availability-2",
    providerId: "provider-2",
    date: "2026-08-21",
    startMinutes: 480,
    endMinutes: 940,
  },
  {
    id: "availability-3",
    providerId: "provider-3",
    date: "2026-08-21",
    startMinutes: 540,
    endMinutes: 1020,
  },
  {
    id: "availability-4",
    providerId: "provider-1",
    date: "2026-08-22",
    startMinutes: 480,
    endMinutes: 960,
  },
  {
    id: "availability-5",
    providerId: "provider-2",
    date: "2026-08-22",
    startMinutes: 540,
    endMinutes: 1020,
  },
  {
    id: "availability-6",
    providerId: "provider-3",
    date: "2026-08-22",
    startMinutes: 480,
    endMinutes: 840,
  },
  {
    id: "availability-7",
    providerId: "provider-1",
    date: "2026-08-23",
    startMinutes: 480,
    endMinutes: 720,
  },
  {
    id: "availability-8",
    providerId: "provider-3",
    date: "2026-08-23",
    startMinutes: 480,
    endMinutes: 720,
  },
];

export const appointments: Appointment[] = [
  {
    id: "appointment-1",
    patientId: "patient-1",
    providerId: "provider-1",
    serviceId: "cleaning",
    date: "2026-08-21",
    startMinutes: 500,
    durationMinutes: 60,
  },
  {
    id: "appointment-2",
    patientId: "patient-2",
    providerId: "provider-1",
    serviceId: "extraction",
    date: "2026-08-21",
    startMinutes: 600,
    durationMinutes: 40,
  },
  {
    id: "appointment-3",
    patientId: "patient-3",
    providerId: "provider-2",
    serviceId: "extraction",
    date: "2026-08-21",
    startMinutes: 520,
    durationMinutes: 40,
  },
  {
    id: "appointment-4",
    patientId: "patient-4",
    providerId: "provider-3",
    serviceId: "cleaning",
    date: "2026-08-21",
    startMinutes: 540,
    durationMinutes: 60,
  },
  {
    id: "appointment-5",
    patientId: "patient-5",
    providerId: "provider-1",
    serviceId: "cleaning",
    date: "2026-08-22",
    startMinutes: 540,
    durationMinutes: 60,
  },
];