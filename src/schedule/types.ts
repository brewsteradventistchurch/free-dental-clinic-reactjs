export type Service = {
  id: string;
  name: string;
  defaultDurationMinutes: number;
  active: boolean;
  displayOrder: number;
};

export type ProviderAvailabilityBlock = {
  startMinutes: number;
  endMinutes: number;
};

export type ProviderAvailability = {
  id: string;
  providerId: string;
  date: string;
  blocks: ProviderAvailabilityBlock[];
};

export type Provider = {
  id: string;
  name: string;
  serviceIds: string[];
  active: boolean;
  displayOrder: number;
};

export type ServiceArea = {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
};

export type ServiceAreaAssignment = {
  id: string;
  serviceAreaId: string;
  providerId: string;
  date: string;
};

export type BookingStatus = {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
};

export type ClinicConfiguration = {
  id: string;
  services: Service[];
  providers: Provider[];
  serviceAreas: ServiceArea[];
  bookingStatuses: BookingStatus[];
  requestSources: string[];
  preferredLanguages: string[];
  communityFollowUps: string[];
  updatedAt: string | null;
  version: number | null;
};

export type PatientNoteLog = {
  id: string;
  note: string;
  createdAt: string;
  volunteerId: string;
  volunteerName: string;
};

export type Patient = {
  id: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  cellPhone: string;
  alternatePhone?: string;
  preferredLanguage: string;
  needsTranslator: boolean;
  streetAddress?: string;
  streetCity?: string;
  streetState?: string;
  streetZip?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  spouseOrParentName?: string;
  referral?: string;
  bookingStatus: string;
  sourceOfRequest: string;
  requestDate: string;
  serviceRequested?: string;
  followUpInterests: string[];
  noteLogs: PatientNoteLog[];
};

export type Appointment = {
  id: string;
  patientId: string;
  serviceAreaId: string;
  providerId: string;
  serviceId: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  bookingStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type AppointmentRequest = {
  patientId: string;
  serviceAreaId: string;
  serviceId: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
  bookingStatus: string;
};