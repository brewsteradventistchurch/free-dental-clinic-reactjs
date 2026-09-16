import type { Patient, PatientNoteLog } from "../schedule/types";

type ApiPatient = {
  id: string;
  patientNumber: string;

  firstName: string;
  lastName: string;
  dateOfBirth: string | null;

  contact: {
    email: string | null;
    cellPhone: string | null;
    alternatePhone: string | null;
  } | null;

  streetAddress: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;

  mailingAddress: {
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;

  spouseOrParentName: string | null;
  preferredLanguage: string | null;
  needsTranslator: boolean;

  request: {
    bookingStatus: string | null;
    sourceOfRequest: string | null;
    requestDate: string | null;
    serviceRequested: string | null;
    referral: string | null;
  } | null;

  followUpInterests: string[];
  noteLogs: ApiPatientNoteLog[];
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiPatientNoteLog = {
  id: string;
  note: string;
  createdAt: string;
  volunteerId: string;
  volunteerName: string;
};

export type PatientRequest = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;

  contact: {
    email: string;
    cellPhone: string;
    alternatePhone: string;
  } | null;

  streetAddress: {
    address: string;
    city: string;
    state: string;
    zip: string;
  } | null;

  mailingAddress: {
    address: string;
    city: string;
    state: string;
    zip: string;
  } | null;

  spouseOrParentName: string;
  preferredLanguage: string;
  needsTranslator: boolean;

  request: {
    bookingStatus: string;
    sourceOfRequest: string;
    requestDate: string | null;
    serviceRequested: string;
    referral: string;
  } | null;

  followUpInterests: string[];
  noteLogs: PatientNoteLog[];
};

type CsrfResponse = {
  headerName: string;
  token: string;
};

let csrfToken: CsrfResponse | null = null;

async function getCsrfToken(): Promise<CsrfResponse> {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch("/api/v1/auth/csrf", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(
      `Loading CSRF token failed: ${response.status}`,
    );
  }

  csrfToken = (await response.json()) as CsrfResponse;

  return csrfToken;
}

function fromApiPatient(patient: ApiPatient): Patient {
  return {
    id: patient.id,
    patientNumber: patient.patientNumber,

    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth ?? undefined,

    email: patient.contact?.email ?? undefined,
    cellPhone: patient.contact?.cellPhone ?? "",
    alternatePhone: patient.contact?.alternatePhone ?? undefined,

    preferredLanguage: patient.preferredLanguage ?? "English",
    needsTranslator: patient.needsTranslator,

    streetAddress: patient.streetAddress?.address ?? undefined,
    streetCity: patient.streetAddress?.city ?? undefined,
    streetState: patient.streetAddress?.state ?? undefined,
    streetZip: patient.streetAddress?.zip ?? undefined,

    mailingAddress: patient.mailingAddress?.address ?? undefined,
    mailingCity: patient.mailingAddress?.city ?? undefined,
    mailingState: patient.mailingAddress?.state ?? undefined,
    mailingZip: patient.mailingAddress?.zip ?? undefined,

    spouseOrParentName: patient.spouseOrParentName ?? undefined,
    referral: patient.request?.referral ?? undefined,

    bookingStatus: patient.request?.bookingStatus ?? "",
    sourceOfRequest: patient.request?.sourceOfRequest ?? "",
    requestDate: patient.request?.requestDate ?? "",
    serviceRequested:
      patient.request?.serviceRequested ?? undefined,

    followUpInterests: [...(patient.followUpInterests ?? [])],
    noteLogs: [...(patient.noteLogs ?? [])],
  };
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = await response.text();
    return body ? ` - ${body}` : "";
  } catch {
    return "";
  }
}

async function parsePatientResponse(
  response: Response,
  operation: string,
): Promise<ApiPatient> {
  if (!response.ok) {
    throw new Error(
      `${operation} failed: ${response.status}${await parseError(response)}`,
    );
  }

  return response.json() as Promise<ApiPatient>;
}

export async function createPatient(
  request: PatientRequest,
): Promise<Patient> {
    const csrf = await getCsrfToken();
    const response = await fetch("/api/v1/patients", {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify(request),
    });

    return fromApiPatient(
        await parsePatientResponse(response, "Creating patient"),
    );
}

export async function updatePatient(
  id: string,
  request: PatientRequest,
): Promise<Patient> {
  const csrf = await getCsrfToken();
  const response = await fetch(
    `/api/v1/patients/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(request),
    },
  );

  return fromApiPatient(
    await parsePatientResponse(response, "Updating patient"),
  );
}

export async function getPatient(id: string): Promise<Patient> {
  const response = await fetch(
    `/api/v1/patients/${encodeURIComponent(id)}`,
    {
      credentials: "include",
    },
  );

  return fromApiPatient(
    await parsePatientResponse(response, "Loading patient"),
  );
}

export async function searchPatients(
  query: string,
  signal?: AbortSignal,
): Promise<Patient[]> {
  const response = await fetch(
    `/api/v1/patients?search=${encodeURIComponent(query)}`,
    {
      credentials: "include",
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Searching patients failed: ${response.status}${await parseError(response)}`,
    );
  }

  const patients =
    (await response.json()) as ApiPatient[];

  return patients.map(fromApiPatient);
}