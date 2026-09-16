import type { ServiceAreaAssignment } from "../schedule/types";

const ASSIGNMENTS_URL =
  "/api/v1/service-area-assignments";

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
      `Loading CSRF token failed: ${response.status}`
    );
  }

  csrfToken = (await response.json()) as CsrfResponse;
  return csrfToken;
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}.`;

  try {
    const problem = await response.json();

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
    }
  } catch {
    // Keep default.
  }

  throw new Error(message);
}

async function request<T>(
  url: string,
  options?: RequestInit
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
  options: RequestInit
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

export async function getServiceAreaAssignments(
  date: string
): Promise<ServiceAreaAssignment[]> {
  return request<ServiceAreaAssignment[]>(
    `${ASSIGNMENTS_URL}?date=${encodeURIComponent(date)}`
  );
}

export async function assignProviderToServiceArea(
  serviceAreaId: string,
  providerId: string,
  date: string
): Promise<ServiceAreaAssignment> {
  return writeRequest<ServiceAreaAssignment>(
    `${ASSIGNMENTS_URL}?serviceAreaId=${encodeURIComponent(
      serviceAreaId
    )}&providerId=${encodeURIComponent(
      providerId
    )}&date=${encodeURIComponent(date)}`,
    {
      method: "PUT",
    }
  );
}

export async function removeServiceAreaAssignment(
  serviceAreaId: string,
  date: string
): Promise<void> {
  await writeRequest<void>(
    `${ASSIGNMENTS_URL}?serviceAreaId=${encodeURIComponent(
      serviceAreaId
    )}&date=${encodeURIComponent(date)}`,
    {
      method: "DELETE",
    }
  );
}