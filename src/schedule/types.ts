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

export type Patient = {
  id: string;
  firstName: string;
  lastName: string;
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