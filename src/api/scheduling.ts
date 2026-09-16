import type {
  Appointment,
  ProviderAvailability,
  ServiceAreaAssignment,
} from "../schedule/types";

const APPOINTMENTS_URL = "/api/v1/appointments";
const PROVIDER_AVAILABILITY_URL = "/api/v1/provider-availability";
const SERVICE_AREA_ASSIGNMENTS_URL = "/api/v1/service-area-assignments";

type CsrfResponse = {
  headerName: string;
  token: string;
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

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}.`;

  try {
    const text = await response.text();

    if (text.trim()) {
      try {
        const problem = JSON.parse(text) as {
          detail?: unknown;
          message?: unknown;
          title?: unknown;
        };

        if (
          typeof problem.detail === "string" &&
          problem.detail.trim()
        ) {
          message = problem.detail;
        } else if (
          typeof problem.message === "string" &&
          problem.message.trim()
        ) {
          message = problem.message;
        } else if (
          typeof problem.title === "string" &&
          problem.title.trim()
        ) {
          message = problem.title;
        } else {
          message = text;
        }
      } catch {
        message = text;
      }
    }
  } catch {
    // Keep the default HTTP status message.
  }

  throw new Error(message);
}

async function request<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options?.headers,
    },
  });

  if (!response.ok) {
    await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function writeRequest<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  const csrf = await getCsrfToken();

  return request<T>(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      [csrf.headerName]: csrf.token,
      ...options.headers,
    },
  });
}

export async function getAppointments(
  date: string,
): Promise<Appointment[]> {
  return request<Appointment[]>(
    `${APPOINTMENTS_URL}?date=${encodeURIComponent(date)}`,
  );
}

export async function createAppointment(
  appointment: AppointmentRequest,
): Promise<Appointment> {
  return writeRequest<Appointment>(APPOINTMENTS_URL, {
    method: "POST",
    body: JSON.stringify(appointment),
  });
}

export async function updateAppointment(
  id: string,
  appointment: AppointmentRequest,
): Promise<Appointment> {
  return writeRequest<Appointment>(
    `${APPOINTMENTS_URL}/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify(appointment),
    },
  );
}

export async function deleteAppointment(
  id: string,
): Promise<void> {
  await writeRequest<void>(
    `${APPOINTMENTS_URL}/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
}

export async function getProviderAvailability(
  date: string,
): Promise<ProviderAvailability[]> {
  return request<ProviderAvailability[]>(
    `${PROVIDER_AVAILABILITY_URL}?date=${encodeURIComponent(date)}`,
  );
}

export async function getProviderAvailabilityForProvider(
  providerId: string,
  date: string,
): Promise<ProviderAvailability> {
  return request<ProviderAvailability>(
    `${PROVIDER_AVAILABILITY_URL}/${encodeURIComponent(providerId)}?date=${encodeURIComponent(date)}`,
  );
}

export async function getServiceAreaAssignments(
  date: string,
): Promise<ServiceAreaAssignment[]> {
  return request<ServiceAreaAssignment[]>(
    `${SERVICE_AREA_ASSIGNMENTS_URL}?date=${encodeURIComponent(date)}`,
  );
}

export async function getServiceAreaAssignment(
  serviceAreaId: string,
  date: string,
): Promise<ServiceAreaAssignment> {
  return request<ServiceAreaAssignment>(
    `${SERVICE_AREA_ASSIGNMENTS_URL}/${encodeURIComponent(serviceAreaId)}?date=${encodeURIComponent(date)}`,
  );
}

export async function saveProviderAvailability(
  availability: ProviderAvailability,
): Promise<ProviderAvailability> {
  const csrfResponse = await fetch(
    "/api/v1/auth/csrf",
    {
      credentials: "include",
    },
  );

  if (!csrfResponse.ok) {
    throw new Error(
      "Unable to obtain CSRF token.",
    );
  }

  const csrf = (await csrfResponse.json()) as {
    headerName: string;
    token: string;
  };

  const response = await fetch(
    "/api/v1/provider-availability",
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        [csrf.headerName]: csrf.token,
      },
      body: JSON.stringify(availability),
    },
  );

  if (!response.ok) {
    let message =
      "Unable to save provider availability.";

    try {
      const body = await response.json();

      if (typeof body?.message === "string") {
        message = body.message;
      } else if (
        typeof body?.detail === "string"
      ) {
        message = body.detail;
      }
    } catch {
      // Keep fallback message.
    }

    throw new Error(message);
  }

  return (await response.json()) as ProviderAvailability;
}

export async function deleteProviderAvailability(
  providerId: string,
  date: string,
): Promise<void> {
  const csrfResponse = await fetch(
    "/api/v1/auth/csrf",
    {
      credentials: "include",
    },
  );

  if (!csrfResponse.ok) {
    throw new Error(
      "Unable to obtain CSRF token.",
    );
  }

  const csrf = (await csrfResponse.json()) as {
    headerName: string;
    token: string;
  };

  const query = new URLSearchParams({
    providerId,
    date,
  });

  const response = await fetch(
    `/api/v1/provider-availability?${query.toString()}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        [csrf.headerName]: csrf.token,
      },
    },
  );

  if (!response.ok) {
    let message =
      "Unable to delete provider availability.";

    try {
      const body = await response.json();

      if (typeof body?.message === "string") {
        message = body.message;
      } else if (
        typeof body?.detail === "string"
      ) {
        message = body.detail;
      }
    } catch {
      // Keep fallback message.
    }

    throw new Error(message);
  }
}