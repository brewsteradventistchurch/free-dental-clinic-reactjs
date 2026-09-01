import type {
  Appointment,
  Patient,
  Provider,
  ProviderAvailability,
  ServiceType,
} from "./types";

export const services: ServiceType[] = [
  {
    id: "cleaning",
    name: "Cleaning",
    defaultDurationMinutes: 60,
  },
  {
    id: "extraction",
    name: "Extraction",
    defaultDurationMinutes: 40,
  },
  {
    id: "filling",
    name: "Filling",
    defaultDurationMinutes: 60,
  },
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

export const bookingStatuses: string[] = [
  "Booked",
  "Declined",
  "Walk-in - Day of Clinic",
  "Follow Up - Needed",
  "Waiting List - Ready",
  "Walk-In - Arranged",
  "Duplicate",
  "First Call - Needed",
  "First Call - V/M Left",
  "Follow Up - V/M Left",
  "Waiting List - Priority",
];

export const requestSources: string[] = [
  "Voicemail Message",
  "Email Message",
  "Family Member",
  "Walk-in",
  "Omak 2024 Clinic",
  "Friend",
  "Text Message",
];

export const preferredLanguages: string[] = [
  "English",
  "Spanish",
];

export const followUpInterests: string[] = [
  "Bible studies",
  "Walking club",
  "Cooking for the holidays",
  "Dinner with the doctor",
  "Nutrition classes",
];

export const patients: Patient[] = [
  {
    id: "patient-1",
    patientNumber: "001",
    firstName: "Maria",
    lastName: "Garcia",
    dateOfBirth: "1985-04-14",

    cellPhone: "509-555-0101",
    alternatePhone: "",
    email: "maria.garcia@example.com",

    streetAddress: "101 Main Street",
    streetCity: "Omak",

    mailingAddress: "101 Main Street",
    mailingCity: "Omak",

    spouseOrParentName: "",
    referral: "Friend",

    bookingStatus: "Booked",
    sourceOfRequest: "Text Message",
    requestDate: "2026-08-28T09:15:00",

    serviceRequested: "cleaning",

    preferredLanguage: "Spanish",
    needsTranslator: true,

    followUpInterests: [
      "Nutrition classes",
    ],

    noteLogs: [
      {
        id: "note-1",
        note: "Patient requested a morning appointment if possible.",
        volunteerId: "1",
        volunteerName: "Dental Volunteer",
        createdAt: "2026-08-28T09:20:00",
      },
    ],
  },

  {
    id: "patient-2",
    patientNumber: "002",
    firstName: "Robert",
    lastName: "Martinez",
    dateOfBirth: "1978-09-22",

    cellPhone: "509-555-0102",
    alternatePhone: "509-555-0199",
    email: "robert.martinez@example.com",

    streetAddress: "245 Cedar Avenue",
    streetCity: "Omak",

    mailingAddress: "245 Cedar Avenue",
    mailingCity: "Omak",

    spouseOrParentName: "Ana Martinez",
    referral: "Family Member",

    bookingStatus: "Follow Up - Needed",
    sourceOfRequest: "Voicemail Message",
    requestDate: "2026-08-27T14:30:00",

    serviceRequested: "extraction",

    preferredLanguage: "English",
    needsTranslator: false,

    followUpInterests: [
      "Bible studies",
      "Dinner with the doctor",
    ],

    noteLogs: [
      {
        id: "note-2",
        note: "Left voicemail requesting a callback.",
        volunteerId: "1",
        volunteerName: "Dental Volunteer",
        createdAt: "2026-08-27T14:35:00",
      },
    ],
  },

  {
    id: "patient-3",
    patientNumber: "003",
    firstName: "James",
    lastName: "Wilson",
    dateOfBirth: "1969-02-08",

    cellPhone: "509-555-0103",
    alternatePhone: "",
    email: "",

    streetAddress: "78 Pine Road",
    streetCity: "Omak",

    mailingAddress: "78 Pine Road",
    mailingCity: "Omak",

    spouseOrParentName: "",
    referral: "Friend",

    bookingStatus: "Waiting List - Ready",
    sourceOfRequest: "Email Message",
    requestDate: "2026-08-26T11:10:00",

    serviceRequested: "filling",

    preferredLanguage: "English",
    needsTranslator: false,

    followUpInterests: [
      "Walking club",
    ],

    noteLogs: [],
  },

  {
    id: "patient-4",
    patientNumber: "004",
    firstName: "Ana",
    lastName: "Rodriguez",
    dateOfBirth: "1992-11-30",

    cellPhone: "509-555-0104",
    alternatePhone: "",
    email: "ana.rodriguez@example.com",

    streetAddress: "412 Oak Street",
    streetCity: "Omak",

    mailingAddress: "412 Oak Street",
    mailingCity: "Omak",

    spouseOrParentName: "Carlos Rodriguez",
    referral: "Family Member",

    bookingStatus: "Booked",
    sourceOfRequest: "Family Member",
    requestDate: "2026-08-25T16:45:00",

    serviceRequested: "cleaning",

    preferredLanguage: "Spanish",
    needsTranslator: true,

    followUpInterests: [
      "Cooking for the holidays",
      "Nutrition classes",
    ],

    noteLogs: [],
  },

  {
    id: "patient-5",
    patientNumber: "005",
    firstName: "David",
    lastName: "Anderson",
    dateOfBirth: "1958-06-17",

    cellPhone: "509-555-0105",
    alternatePhone: "",
    email: "david.anderson@example.com",

    streetAddress: "19 Birch Lane",
    streetCity: "Omak",

    mailingAddress: "19 Birch Lane",
    mailingCity: "Omak",

    spouseOrParentName: "",
    referral: "Friend",

    bookingStatus: "First Call - V/M Left",
    sourceOfRequest: "Voicemail Message",
    requestDate: "2026-08-29T08:05:00",

    serviceRequested: "extraction",

    preferredLanguage: "English",
    needsTranslator: false,

    followUpInterests: [
      "Dinner with the doctor",
    ],

    noteLogs: [],
  },
];

export const providerAvailability: ProviderAvailability[] = [
  {
    id: "availability-1",
    providerId: "provider-1",
    date: "2026-09-05",
    startMinutes: 480,
    endMinutes: 960,
  },
  {
    id: "availability-2",
    providerId: "provider-2",
    date: "2026-09-05",
    startMinutes: 480,
    endMinutes: 940,
  },
  {
    id: "availability-3",
    providerId: "provider-3",
    date: "2026-09-05",
    startMinutes: 540,
    endMinutes: 1020,
  },
  {
    id: "availability-4",
    providerId: "provider-1",
    date: "2026-09-06",
    startMinutes: 480,
    endMinutes: 960,
  },
  {
    id: "availability-5",
    providerId: "provider-2",
    date: "2026-09-06",
    startMinutes: 540,
    endMinutes: 1020,
  },
  {
    id: "availability-6",
    providerId: "provider-3",
    date: "2026-09-06",
    startMinutes: 480,
    endMinutes: 840,
  },
  {
    id: "availability-7",
    providerId: "provider-1",
    date: "2026-09-07",
    startMinutes: 480,
    endMinutes: 720,
  },
  {
    id: "availability-8",
    providerId: "provider-3",
    date: "2026-09-07",
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
    date: "2026-09-05",
    startMinutes: 500,
    durationMinutes: 60,
  },
  {
    id: "appointment-2",
    patientId: "patient-2",
    providerId: "provider-1",
    serviceId: "extraction",
    date: "2026-09-05",
    startMinutes: 600,
    durationMinutes: 40,
  },
  {
    id: "appointment-3",
    patientId: "patient-3",
    providerId: "provider-2",
    serviceId: "extraction",
    date: "2026-09-05",
    startMinutes: 520,
    durationMinutes: 40,
  },
  {
    id: "appointment-4",
    patientId: "patient-4",
    providerId: "provider-3",
    serviceId: "cleaning",
    date: "2026-09-05",
    startMinutes: 540,
    durationMinutes: 60,
  },
  {
    id: "appointment-5",
    patientId: "patient-5",
    providerId: "provider-1",
    serviceId: "cleaning",
    date: "2026-09-06",
    startMinutes: 540,
    durationMinutes: 60,
  },
];