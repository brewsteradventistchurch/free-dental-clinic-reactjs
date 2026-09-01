export type ServiceType = {
  id: string;
  name: string;
  defaultDurationMinutes: number;
};

export type Provider = {
  id: string;
  name: string;
  title: string;
  serviceIds: string[];
};

/** One continuous block of time when a provider is available on a date. */
export type ProviderAvailability = {
  id: string;
  providerId: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
};

export type BookingStatus = string;

export type RequestSource = string;

export type FollowUpInterest = string;

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

  bookingStatus: BookingStatus;
  sourceOfRequest: RequestSource;
  requestDate: string;

  serviceRequested?: string;

  followUpInterests: FollowUpInterest[];

  noteLogs: PatientNoteLog[];

  // createdAt: string;
  // updatedAt: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  providerId: string;
  serviceId: string;
  date: string;
  startMinutes: number;
  durationMinutes: number;
};