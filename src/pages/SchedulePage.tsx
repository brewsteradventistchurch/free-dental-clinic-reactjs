import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useSearchParams } from "react-router-dom";

import {
  createAppointment,
  deleteAppointment,
  getAppointments,
  getProviderAvailability,
  getServiceAreaAssignments,
  updateAppointment,
} from "../api/scheduling";
import type { AppointmentRequest } from "../api/scheduling";
import { getConfiguration } from "../api/configurationApi";
import {
  getPatient,
  searchPatients,
} from "../api/patients";
import type {
  Appointment,
  ClinicConfiguration,
  Patient,
  Provider,
  ProviderAvailability,
  Service,
  ServiceAreaAssignment,
} from "../schedule/types";

import "./SchedulePage.css";

const SLOT_MINUTES = 20;
const SLOT_HEIGHT = 44;
const DAY_START = 7 * 60;
const DAY_END = 18 * 60;

const INITIAL_DATE_SEARCH_DAYS = 60;

type ScheduleDayData = {
  appointments: Appointment[];
  availability: ProviderAvailability[];
  assignments: ServiceAreaAssignment[];
};

type AppointmentDraft = AppointmentRequest & {
  id?: string;
};

type PendingMove = {
  appointment: Appointment;
  serviceAreaId: string;
  startMinutes: number;
};

type DragInteraction = {
  mode: "drag" | "resize";
  appointment: Appointment;
  pointerStartX: number;
  pointerStartY: number;
  originalStartMinutes: number;
  originalDurationMinutes: number;
  originalServiceAreaId: string;
  moved: boolean;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
}

function todayString(): string {
  return localDateString(new Date());
}

function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return localDateString(date);
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );
}

function formatTime(minutes: number): string {
  const hour24 = Math.floor(minutes / 60);
  const minute = minutes % 60;

  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${pad(minute)} ${suffix}`;
}

function minutesToTimeInput(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(
    minutes % 60,
  )}`;
}

function timeInputToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return DAY_START;
  }

  return hour * 60 + minute;
}

function roundToSlot(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function ceilToSlot(minutes: number): number {
  return Math.ceil(minutes / SLOT_MINUTES) * SLOT_MINUTES;
}

function overlaps(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  const endA = startA + durationA;
  const endB = startB + durationB;

  return startA < endB && endA > startB;
}

async function fetchDayData(
  date: string,
): Promise<ScheduleDayData> {
  const [
    appointments,
    availability,
    assignments,
  ] = await Promise.all([
    getAppointments(date),
    getProviderAvailability(date),
    getServiceAreaAssignments(date),
  ]);

  return {
    appointments,
    availability,
    assignments,
  };
}

function getProviderForArea(
  areaId: string,
  data: ScheduleDayData,
  configuration: ClinicConfiguration,
): Provider | undefined {
  const assignment = data.assignments.find(
    (item) => item.serviceAreaId === areaId,
  );

  if (!assignment) {
    return undefined;
  }

  return configuration.providers.find(
    (provider) =>
      provider.id === assignment.providerId &&
      provider.active,
  );
}

function getServicesForArea(
  areaId: string,
  data: ScheduleDayData,
  configuration: ClinicConfiguration,
): Service[] {
  const provider = getProviderForArea(
    areaId,
    data,
    configuration,
  );

  if (!provider) {
    return [];
  }

  const serviceIds = new Set(provider.serviceIds);

  return configuration.services
    .filter(
      (service) =>
        service.active && serviceIds.has(service.id),
    )
    .sort(
      (a, b) => a.displayOrder - b.displayOrder,
    );
}

function isRangeAvailable(
  areaId: string,
  serviceId: string,
  startMinutes: number,
  durationMinutes: number,
  data: ScheduleDayData,
  configuration: ClinicConfiguration,
  excludedAppointmentId?: string,
): boolean {
  const provider = getProviderForArea(
    areaId,
    data,
    configuration,
  );

  if (!provider) {
    return false;
  }

  const service = configuration.services.find(
    (item) =>
      item.id === serviceId &&
      item.active,
  );

  if (
    !service ||
    !provider.serviceIds.includes(service.id)
  ) {
    return false;
  }

  const endMinutes =
    startMinutes + durationMinutes;

  if (
    startMinutes < DAY_START ||
    endMinutes > DAY_END ||
    durationMinutes <= 0
  ) {
    return false;
  }

  const availability =
    data.availability.find(
      (item) =>
        item.providerId ===
        provider.id,
    );

  if (!availability) {
    return false;
  }

  const insideAvailability =
    availability.blocks.some(
      (block) =>
        startMinutes >=
          block.startMinutes &&
        endMinutes <=
          block.endMinutes,
    );

  if (!insideAvailability) {
    return false;
  }

  const conflictingAppointment =
    data.appointments.some(
      (appointment) => {
        if (
          appointment.id ===
          excludedAppointmentId
        ) {
          return false;
        }

        if (
          !overlaps(
            startMinutes,
            durationMinutes,
            appointment.startMinutes,
            appointment.durationMinutes,
          )
        ) {
          return false;
        }

        /*
         * An appointment occupies both:
         *
         * 1. its service area
         * 2. its resolved provider
         *
         * Therefore either conflict makes the proposed
         * placement invalid.
         */
        return (
          appointment.serviceAreaId ===
            areaId ||
          appointment.providerId ===
            provider.id
        );
      },
    );

  return !conflictingAppointment;
}

function findFirstAvailableStart(
  areaId: string,
  minimumStartMinutes: number,
  data: ScheduleDayData,
  configuration: ClinicConfiguration,
): number | null {
  const provider = getProviderForArea(
    areaId,
    data,
    configuration,
  );

  if (!provider) {
    return null;
  }

  const services = getServicesForArea(
    areaId,
    data,
    configuration,
  );

  if (services.length === 0) {
    return null;
  }

  const availability = data.availability.find(
    (item) => item.providerId === provider.id,
  );

  if (!availability) {
    return null;
  }

  for (
    let start = Math.max(
      DAY_START,
      ceilToSlot(minimumStartMinutes),
    );
    start < DAY_END;
    start += SLOT_MINUTES
  ) {
    for (const service of services) {
      const duration = Math.max(
        SLOT_MINUTES,
        service.defaultDurationMinutes,
      );

      if (
        isRangeAvailable(
          areaId,
          service.id,
          start,
          duration,
          data,
          configuration,
        )
      ) {
        return start;
      }
    }
  }

  return null;
}

async function findInitialScheduleData(
  configuration: ClinicConfiguration,
): Promise<{
  date: string;
  data: ScheduleDayData;
}> {
  const today = todayString();

  for (
    let offset = 0;
    offset <= INITIAL_DATE_SEARCH_DAYS;
    offset += 1
  ) {
    const date = addDays(today, offset);

    const [
      availability,
      assignments,
    ] = await Promise.all([
      getProviderAvailability(date),
      getServiceAreaAssignments(date),
    ]);

    if (
      availability.length === 0 ||
      assignments.length === 0
    ) {
      continue;
    }

    const preliminaryData: ScheduleDayData = {
      appointments: [],
      availability,
      assignments,
    };

    const minimumStart =
      date === today
        ? Math.max(
            DAY_START,
            ceilToSlot(
              new Date().getHours() * 60 +
                new Date().getMinutes(),
            ),
          )
        : DAY_START;

    const possibleArea = configuration.serviceAreas
      .filter((area) => area.active)
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder,
      )
      .some(
        (area) =>
          findFirstAvailableStart(
            area.id,
            minimumStart,
            preliminaryData,
            configuration,
          ) !== null,
      );

    if (!possibleArea) {
      continue;
    }

    const appointments =
      await getAppointments(date);

    const completeData: ScheduleDayData = {
      appointments,
      availability,
      assignments,
    };

    const actualAvailableArea =
      configuration.serviceAreas
        .filter((area) => area.active)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder,
        )
        .some(
          (area) =>
            findFirstAvailableStart(
              area.id,
              minimumStart,
              completeData,
              configuration,
            ) !== null,
        );

    if (actualAvailableArea) {
      return {
        date,
        data: completeData,
      };
    }
  }

  return {
    date: today,
    data: await fetchDayData(today),
  };
}

export default function SchedulePage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const patientContextId =
    searchParams.get("patientId");

  const [
    configuration,
    setConfiguration,
  ] = useState<ClinicConfiguration | null>(
    null,
  );

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(todayString());

  const [
    dayData,
    setDayData,
  ] = useState<ScheduleDayData>({
    appointments: [],
    availability: [],
    assignments: [],
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    patientsById,
    setPatientsById,
  ] = useState<Record<string, Patient>>(
    {},
  );

  const patientCacheRef = useRef(
    new Map<string, Patient>(),
  );

  const [
    modalDraft,
    setModalDraft,
  ] = useState<AppointmentDraft | null>(
    null,
  );

  const [
    modalDayData,
    setModalDayData,
  ] = useState<ScheduleDayData | null>(
    null,
  );

  const [
    modalDayLoading,
    setModalDayLoading,
  ] = useState(false);

  const [
    modalError,
    setModalError,
  ] = useState<string | null>(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    patientSearch,
    setPatientSearch,
  ] = useState("");

  const [
    patientSearchResults,
    setPatientSearchResults,
  ] = useState<Patient[]>([]);

  const [
    patientSearchLoading,
    setPatientSearchLoading,
  ] = useState(false);

  const [
    pendingMove,
    setPendingMove,
  ] = useState<PendingMove | null>(
    null,
  );

  const [
    dragError,
    setDragError,
  ] = useState<string | null>(null);

  const [
    activeInteractionAppointmentId,
    setActiveInteractionAppointmentId,
  ] = useState<string | null>(null);

  const interactionRef =
    useRef<DragInteraction | null>(null);

  const clickSuppressedRef =
    useRef(false);

  const loadRequestRef = useRef(0);

  const activeServiceAreas = useMemo(() => {
    if (!configuration) {
      return [];
    }

    return configuration.serviceAreas
      .filter((area) => area.active)
      .sort(
        (a, b) =>
          a.displayOrder - b.displayOrder,
      );
  }, [configuration]);

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();

    configuration?.providers.forEach(
      (provider) => {
        map.set(provider.id, provider);
      },
    );

    return map;
  }, [configuration]);

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();

    configuration?.services.forEach(
      (service) => {
        map.set(service.id, service);
      },
    );

    return map;
  }, [configuration]);

  const bookingStatuses = useMemo(
    () =>
      configuration?.bookingStatuses
        .filter((status) => status.active)
        .sort(
          (a, b) =>
            a.displayOrder - b.displayOrder,
        ) ?? [],
    [configuration],
  );

  const loadPatientsForIds = useCallback(
    async (ids: string[]) => {
      const uniqueIds = [
        ...new Set(
          ids.filter(Boolean),
        ),
      ];

      const missingIds = uniqueIds.filter(
        (id) =>
          !patientCacheRef.current.has(id),
      );

      if (missingIds.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        missingIds.map((id) =>
          getPatient(id),
        ),
      );

      const loaded: Patient[] = [];

      results.forEach((result) => {
        if (
          result.status === "fulfilled"
        ) {
          patientCacheRef.current.set(
            result.value.id,
            result.value,
          );
          loaded.push(result.value);
        }
      });

      if (loaded.length > 0) {
        setPatientsById((current) => {
          const next = {
            ...current,
          };

          loaded.forEach((patient) => {
            next[patient.id] = patient;
          });

          return next;
        });
      }
    },
    [],
  );

  const loadDate = useCallback(
    async (date: string) => {
      if (!configuration) {
        return;
      }

      const requestId =
        ++loadRequestRef.current;

      setLoading(true);
      setError(null);

      try {
        const data =
          await fetchDayData(date);

        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setSelectedDate(date);
        setDayData(data);

        void loadPatientsForIds(
          data.appointments.map(
            (appointment) =>
              appointment.patientId,
          ),
        );
      } catch (caught) {
        if (
          requestId !==
          loadRequestRef.current
        ) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Loading the schedule failed.",
        );
      } finally {
        if (
          requestId ===
          loadRequestRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [configuration, loadPatientsForIds],
  );

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError(null);

      try {
        const loadedConfiguration =
          await getConfiguration();

        if (cancelled) {
          return;
        }

        setConfiguration(
          loadedConfiguration,
        );

        const initial =
          await findInitialScheduleData(
            loadedConfiguration,
          );

        if (cancelled) {
          return;
        }

        setSelectedDate(initial.date);
        setDayData(initial.data);

        void loadPatientsForIds(
          initial.data.appointments.map(
            (appointment) =>
              appointment.patientId,
          ),
        );
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Loading the schedule failed.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [loadPatientsForIds]);

  useEffect(() => {
    const contextId = patientContextId;

    if (contextId === null) {
      return;
    }

    if (patientCacheRef.current.has(contextId)) {
      return;
    }

    let cancelled = false;

    async function loadContextPatient(id: string) {
      try {
        const patient = await getPatient(id);

        if (cancelled) {
          return;
        }

        patientCacheRef.current.set(patient.id, patient);

        setPatientsById((current) => ({
          ...current,
          [patient.id]: patient,
        }));
      } catch {
        // The scheduling page can still function
        // without the patient context.
      }
    }

    void loadContextPatient(contextId);

    return () => {
      cancelled = true;
    };
  }, [patientContextId]);

  useEffect(() => {
    if (
      !modalDraft ||
      modalDraft.patientId
    ) {
      return;
    }

    if (!patientContextId) {
      return;
    }

    setModalDraft((current) =>
      current
        ? {
            ...current,
            patientId:
              patientContextId,
          }
        : current,
    );
  }, [
    modalDraft,
    patientContextId,
  ]);

  useEffect(() => {
    if (
      !modalDraft ||
      !modalDraft.date
    ) {
      return;
    }

    if (
      modalDraft.date ===
      selectedDate
    ) {
      setModalDayData(dayData);
      return;
    }

    let cancelled = false;

    setModalDayLoading(true);

    void fetchDayData(
      modalDraft.date,
    )
      .then((data) => {
        if (!cancelled) {
          setModalDayData(data);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setModalError(
            caught instanceof Error
              ? caught.message
              : "Loading the selected date failed.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModalDayLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    modalDraft?.date,
    selectedDate,
    dayData,
  ]);

  useEffect(() => {
    if (
      !modalDraft ||
      !modalDayData ||
      !configuration
    ) {
      return;
    }

    const services =
      getServicesForArea(
        modalDraft.serviceAreaId,
        modalDayData,
        configuration,
      );

    if (
      services.length === 0
    ) {
      if (modalDraft.serviceId) {
        setModalDraft((current) =>
          current
            ? {
                ...current,
                serviceId: "",
              }
            : current,
        );
      }

      return;
    }

    const currentStillValid =
      services.some(
        (service) =>
          service.id ===
          modalDraft.serviceId,
      );

    if (!currentStillValid) {
      setModalDraft((current) =>
        current
          ? {
              ...current,
              serviceId:
                services[0].id,
            }
          : current,
      );
    }
  }, [
    modalDraft,
    modalDayData,
    configuration,
  ]);

  useEffect(() => {
    if (
      !modalDraft ||
      !patientSearch.trim()
    ) {
      setPatientSearchResults([]);
      setPatientSearchLoading(false);
      return;
    }

    if (
      patientSearch.trim().length < 2
    ) {
      setPatientSearchResults([]);
      return;
    }

    const controller =
      new AbortController();

    const timer = window.setTimeout(
      async () => {
        setPatientSearchLoading(true);

        try {
          const patients =
            await searchPatients(
              patientSearch.trim(),
              controller.signal,
            );

          setPatientSearchResults(
            patients,
          );
        } catch (caught) {
          if (
            caught instanceof
              DOMException &&
            caught.name ===
              "AbortError"
          ) {
            return;
          }

          setPatientSearchResults([]);
        } finally {
          if (
            !controller.signal.aborted
          ) {
            setPatientSearchLoading(
              false,
            );
          }
        }
      },
      250,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    patientSearch,
    modalDraft,
  ]);

  function showDragError(
    message: string,
  ) {
    setDragError(message);

    window.setTimeout(() => {
      setDragError(null);
    }, 4000);
  }

  function getPatientName(
    patientId: string,
  ): string {
    const patient =
      patientsById[patientId];

    if (!patient) {
      return `Patient ${patientId}`;
    }

    return `${patient.firstName} ${patient.lastName}`;
  }

  function getAssignedProvider(
    areaId: string,
    data: ScheduleDayData | null,
  ): Provider | undefined {
    if (!data || !configuration) {
      return undefined;
    }

    return getProviderForArea(
      areaId,
      data,
      configuration,
    );
  }

  function getDefaultBookingStatus(
    patientId: string,
  ): string {
    const patient =
      patientsById[patientId];

    if (
      patient &&
      bookingStatuses.some(
        (status) =>
          status.id ===
          patient.bookingStatus,
      )
    ) {
      return patient.bookingStatus;
    }

    return bookingStatuses[0]?.id ?? "";
  }

  function openCreateModal(
    areaId?: string,
    startMinutes?: number,
  ) {
    if (!configuration) {
      return;
    }

    const firstArea =
      areaId ??
      activeServiceAreas[0]?.id;

    if (!firstArea) {
      setModalError(
        "No active service areas are configured.",
      );
      return;
    }

    const services =
      getServicesForArea(
        firstArea,
        dayData,
        configuration,
      );

    if (services.length === 0) {
      setModalError(
        "This service area does not currently have a provider assigned with an active service.",
      );
    } else {
      setModalError(null);
    }

    const service =
      services[0];

    const patientId =
      patientContextId ?? "";

    setPatientSearch("");
    setPatientSearchResults([]);

    setModalDayData(dayData);

    setModalDraft({
      patientId,
      serviceAreaId: firstArea,
      serviceId:
        service?.id ?? "",
      date: selectedDate,
      startMinutes:
        startMinutes ??
        DAY_START,
      durationMinutes:
        service
          ? Math.max(
              SLOT_MINUTES,
              service.defaultDurationMinutes,
            )
          : SLOT_MINUTES,
      bookingStatus:
        getDefaultBookingStatus(
          patientId,
        ),
    });
  }

  function openEditModal(
    appointment: Appointment,
  ) {
    setPatientSearch("");
    setPatientSearchResults([]);
    setModalError(null);

    setModalDayData(dayData);

    setModalDraft({
      id: appointment.id,
      patientId:
        appointment.patientId,
      serviceAreaId:
        appointment.serviceAreaId,
      serviceId:
        appointment.serviceId,
      date:
        appointment.date,
      startMinutes:
        appointment.startMinutes,
      durationMinutes:
        appointment.durationMinutes,
      bookingStatus:
        appointment.bookingStatus,
    });
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalDraft(null);
    setModalDayData(null);
    setModalError(null);
    setPatientSearch("");
    setPatientSearchResults([]);
  }

  async function saveDraft() {
    if (
      !modalDraft ||
      !modalDayData ||
      !configuration
    ) {
      return;
    }

    if (
      !modalDraft.patientId ||
      !modalDraft.serviceAreaId ||
      !modalDraft.serviceId ||
      !modalDraft.bookingStatus
    ) {
      setModalError(
        "Patient, service area, service, and booking status are required.",
      );
      return;
    }

    if (
      modalDraft.startMinutes <
        DAY_START ||
      modalDraft.startMinutes +
        modalDraft.durationMinutes >
        DAY_END
    ) {
      setModalError(
        "The appointment must fit within the clinic schedule.",
      );
      return;
    }

    if (
      !isRangeAvailable(
        modalDraft.serviceAreaId,
        modalDraft.serviceId,
        modalDraft.startMinutes,
        modalDraft.durationMinutes,
        modalDayData,
        configuration,
        modalDraft.id,
      )
    ) {
      setModalError(
        "That time is not available for this service area and provider. Please choose another time.",
      );
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      if (modalDraft.id) {
        await updateAppointment(
          modalDraft.id,
          {
            patientId:
              modalDraft.patientId,
            serviceAreaId:
              modalDraft.serviceAreaId,
            serviceId:
              modalDraft.serviceId,
            date:
              modalDraft.date,
            startMinutes:
              modalDraft.startMinutes,
            durationMinutes:
              modalDraft.durationMinutes,
            bookingStatus:
              modalDraft.bookingStatus,
          },
        );
      } else {
        await createAppointment({
          patientId:
            modalDraft.patientId,
          serviceAreaId:
            modalDraft.serviceAreaId,
          serviceId:
            modalDraft.serviceId,
          date:
            modalDraft.date,
          startMinutes:
            modalDraft.startMinutes,
          durationMinutes:
            modalDraft.durationMinutes,
          bookingStatus:
            modalDraft.bookingStatus,
        });
      }

      closeModal();
      await loadDate(
        modalDraft.date,
      );
    } catch (caught) {
      setModalError(
        caught instanceof Error
          ? caught.message
          : "Saving the appointment failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAppointment() {
    if (!modalDraft?.id) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this appointment?",
      );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setModalError(null);

    try {
      await deleteAppointment(
        modalDraft.id,
      );

      const date =
        modalDraft.date;

      closeModal();
      await loadDate(date);
    } catch (caught) {
      setModalError(
        caught instanceof Error
          ? caught.message
          : "Deleting the appointment failed.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveDraggedAppointment(
    appointment: Appointment,
    serviceAreaId: string,
    startMinutes: number,
    durationMinutes: number,
  ) {
    if (!configuration) {
      return;
    }

    const nextData =
      serviceAreaId ===
        appointment.serviceAreaId
        ? dayData
        : dayData;

    if (
      !isRangeAvailable(
        serviceAreaId,
        appointment.serviceId,
        startMinutes,
        durationMinutes,
        nextData,
        configuration,
        appointment.id,
      )
    ) {
      showDragError(
        "That appointment cannot be placed there because the time is unavailable or conflicts with another appointment.",
      );
      return;
    }

    try {
      await updateAppointment(
        appointment.id,
        {
          patientId:
            appointment.patientId,
          serviceAreaId,
          serviceId:
            appointment.serviceId,
          date:
            appointment.date,
          startMinutes,
          durationMinutes,
          bookingStatus:
            appointment.bookingStatus,
        },
      );

      await loadDate(
        appointment.date,
      );
    } catch (caught) {
      showDragError(
        caught instanceof Error
          ? caught.message
          : "Moving the appointment failed.",
      );
    }
  }

  function getColumnAtPoint(
    x: number,
    y: number,
  ): HTMLElement | null {
    const element =
      document.elementFromPoint(
        x,
        y,
      );

    return (
      element?.closest<HTMLElement>(
        ".service-area-column",
      ) ?? null
    );
  }

  function getColumnByAreaId(
    areaId: string,
  ): HTMLElement | null {
    const columns =
      document.querySelectorAll<HTMLElement>(
        ".service-area-column",
      );

    for (const column of columns) {
      if (
        column.dataset.serviceAreaId ===
        areaId
      ) {
        return column;
      }
    }

    return null;
  }

  function getStartMinutesFromPointer(
    pointerY: number,
    column: HTMLElement,
    durationMinutes: number,
  ): number {
    const rect =
      column.getBoundingClientRect();

    const rawMinutes =
      DAY_START +
      ((pointerY - rect.top) /
        SLOT_HEIGHT) *
        SLOT_MINUTES;

    const rounded =
      roundToSlot(rawMinutes);

    return Math.max(
      DAY_START,
      Math.min(
        DAY_END - durationMinutes,
        rounded,
      ),
    );
  }

  function getPreviewValidity(
    interaction: DragInteraction,
    targetAreaId: string,
    targetStartMinutes: number,
    targetDurationMinutes: number,
  ): boolean {
    if (!configuration) {
      return false;
    }

    return isRangeAvailable(
      targetAreaId,
      interaction.appointment.serviceId,
      targetStartMinutes,
      targetDurationMinutes,
      dayData,
      configuration,
      interaction.appointment.id,
    );
  }

  function handleInteractionMove(
    event: PointerEvent,
  ) {
    const interaction =
      interactionRef.current;

    if (!interaction) {
      return;
    }

    const deltaX =
      event.clientX -
      interaction.pointerStartX;

    const deltaY =
      event.clientY -
      interaction.pointerStartY;

    if (
      Math.abs(deltaX) > 4 ||
      Math.abs(deltaY) > 4
    ) {
      interaction.moved = true;
    }

    if (!interaction.moved) {
      return;
    }

    if (
      interaction.mode === "resize"
    ) {
      const column =
        getColumnByAreaId(
          interaction.originalServiceAreaId,
        );

      if (!column) {
        return;
      }

      const endMinutesRaw =
        DAY_START +
        ((event.clientY -
          column.getBoundingClientRect()
            .top) /
          SLOT_HEIGHT) *
          SLOT_MINUTES;

      const roundedEnd =
        roundToSlot(endMinutesRaw);

      const duration = Math.max(
        SLOT_MINUTES,
        Math.min(
          DAY_END -
            interaction.originalStartMinutes,
          roundedEnd -
            interaction.originalStartMinutes,
        ),
      );

      (
        interaction as DragInteraction & {
          previewDurationMinutes?: number;
        }
      ).previewDurationMinutes =
        duration;

      setActiveInteractionAppointmentId(
        interaction.appointment.id,
      );

      return;
    }

    const targetColumn =
      getColumnAtPoint(
        event.clientX,
        event.clientY,
      );

    const targetAreaId =
      targetColumn?.dataset
        .serviceAreaId ??
      interaction.originalServiceAreaId;

    const column =
      targetColumn ??
      getColumnByAreaId(
        interaction.originalServiceAreaId,
      );

    if (!column) {
      return;
    }

    const targetStartMinutes =
      getStartMinutesFromPointer(
        event.clientY,
        column,
        interaction.originalDurationMinutes,
      );

    const valid =
      getPreviewValidity(
        interaction,
        targetAreaId,
        targetStartMinutes,
        interaction.originalDurationMinutes,
      );

    (
      interaction as DragInteraction & {
        previewAreaId?: string;
        previewStartMinutes?: number;
        previewValid?: boolean;
      }
    ).previewAreaId =
      targetAreaId;

    (
      interaction as DragInteraction & {
        previewAreaId?: string;
        previewStartMinutes?: number;
        previewValid?: boolean;
      }
    ).previewStartMinutes =
      targetStartMinutes;

    (
      interaction as DragInteraction & {
        previewAreaId?: string;
        previewStartMinutes?: number;
        previewValid?: boolean;
      }
    ).previewValid = valid;

    setActiveInteractionAppointmentId(
      interaction.appointment.id,
    );
  }

  function handleInteractionEnd(
    event: PointerEvent,
    moveHandler: (
      event: PointerEvent,
    ) => void,
    upHandler: (
      event: PointerEvent,
    ) => void,
  ) {
    window.removeEventListener(
      "pointermove",
      moveHandler,
    );

    window.removeEventListener(
      "pointerup",
      upHandler,
    );

    document.body.style.userSelect =
      "";

    const interaction =
      interactionRef.current;

    interactionRef.current = null;
    setActiveInteractionAppointmentId(
      null,
    );

    if (!interaction) {
      return;
    }

    if (
      interaction.mode === "resize"
    ) {
      if (!interaction.moved) {
        clickSuppressedRef.current =
          true;
        return;
      }

      clickSuppressedRef.current =
        true;

      const previewDuration =
        (
          interaction as DragInteraction & {
            previewDurationMinutes?: number;
          }
        ).previewDurationMinutes ??
        interaction.originalDurationMinutes;

      if (
        !getPreviewValidity(
          interaction,
          interaction.originalServiceAreaId,
          interaction.originalStartMinutes,
          previewDuration,
        )
      ) {
        showDragError(
          "The appointment cannot be resized into that time because it is unavailable or conflicts with another appointment.",
        );
        return;
      }

      void saveDraggedAppointment(
        interaction.appointment,
        interaction.originalServiceAreaId,
        interaction.originalStartMinutes,
        previewDuration,
      );

      return;
    }

    if (!interaction.moved) {
      clickSuppressedRef.current =
        false;
      return;
    }

    clickSuppressedRef.current =
      true;

    const targetAreaId =
      (
        interaction as DragInteraction & {
          previewAreaId?: string;
        }
      ).previewAreaId ??
      interaction.originalServiceAreaId;

    const targetStart =
      (
        interaction as DragInteraction & {
          previewStartMinutes?: number;
        }
      ).previewStartMinutes ??
      interaction.originalStartMinutes;

    const valid =
      (
        interaction as DragInteraction & {
          previewValid?: boolean;
        }
      ).previewValid ?? false;

    /*
     * Crucially, an invalid drop is never allowed
     * to preview as a valid movement and is rejected
     * before anything is saved.
     */
    if (!valid) {
      showDragError(
        "That appointment cannot be moved there because the time is unavailable or conflicts with another appointment.",
      );
      return;
    }

    if (
      targetAreaId !==
      interaction.originalServiceAreaId
    ) {
      setPendingMove({
        appointment:
          interaction.appointment,
        serviceAreaId:
          targetAreaId,
        startMinutes:
          targetStart,
      });

      return;
    }

    void saveDraggedAppointment(
      interaction.appointment,
      targetAreaId,
      targetStart,
      interaction.originalDurationMinutes,
    );

    void event;
  }

  function beginAppointmentInteraction(
    event: ReactPointerEvent<HTMLElement>,
    appointment: Appointment,
    mode: "drag" | "resize",
  ) {
    if (
      event.button !== 0 &&
      event.pointerType !== "touch"
    ) {
      return;
    }

    event.preventDefault();

    if (mode === "resize") {
      event.stopPropagation();
    }

    document.body.style.userSelect =
      "none";

    const interaction: DragInteraction =
      {
        mode,
        appointment,
        pointerStartX:
          event.clientX,
        pointerStartY:
          event.clientY,
        originalStartMinutes:
          appointment.startMinutes,
        originalDurationMinutes:
          appointment.durationMinutes,
        originalServiceAreaId:
          appointment.serviceAreaId,
        moved: false,
      };

    interactionRef.current =
      interaction;

    setActiveInteractionAppointmentId(
      appointment.id,
    );

    let moveHandler: (
      event: PointerEvent,
    ) => void;

    let upHandler: (
      event: PointerEvent,
    ) => void;

    moveHandler = (
      nativeEvent: PointerEvent,
    ) => {
      handleInteractionMove(
        nativeEvent,
      );
    };

    upHandler = (
      nativeEvent: PointerEvent,
    ) => {
      handleInteractionEnd(
        nativeEvent,
        moveHandler,
        upHandler,
      );
    };

    window.addEventListener(
      "pointermove",
      moveHandler,
    );

    window.addEventListener(
      "pointerup",
      upHandler,
    );
  }

  function handleAppointmentClick(
    appointment: Appointment,
  ) {
    if (clickSuppressedRef.current) {
      clickSuppressedRef.current =
        false;
      return;
    }

    openEditModal(appointment);
  }

  function confirmPendingMove() {
    if (!pendingMove) {
      return;
    }

    const move =
      pendingMove;

    setPendingMove(null);

    void saveDraggedAppointment(
      move.appointment,
      move.serviceAreaId,
      move.startMinutes,
      move.appointment.durationMinutes,
    );
  }

  function cancelPendingMove() {
    setPendingMove(null);
  }

  function clearPatientContext() {
    const next =
      new URLSearchParams(
        searchParams,
      );

    next.delete("patientId");

    setSearchParams(next);
  }

  function handleDraftDateChange(
    date: string,
  ) {
    setModalError(null);

    setModalDraft((current) =>
      current
        ? {
            ...current,
            date,
          }
        : current,
    );

    if (date === selectedDate) {
      setModalDayData(dayData);
      return;
    }

    setModalDayLoading(true);

    void fetchDayData(date)
      .then((data) => {
        setModalDayData(data);
      })
      .catch((caught) => {
        setModalError(
          caught instanceof Error
            ? caught.message
            : "Loading the selected date failed.",
        );
      })
      .finally(() => {
        setModalDayLoading(false);
      });
  }

  function handleDraftAreaChange(
    serviceAreaId: string,
  ) {
    if (!modalDraft || !modalDayData) {
      return;
    }

    const services =
      configuration
        ? getServicesForArea(
            serviceAreaId,
            modalDayData,
            configuration,
          )
        : [];

    const currentServiceStillValid =
      services.some(
        (service) =>
          service.id ===
          modalDraft.serviceId,
      );

    setModalDraft({
      ...modalDraft,
      serviceAreaId,
      serviceId:
        currentServiceStillValid
          ? modalDraft.serviceId
          : services[0]?.id ?? "",
    });

    setModalError(null);
  }

  if (loading && !configuration) {
    return (
      <div className="schedule-page">
        <div className="schedule-header">
          <div>
            <span className="schedule-eyebrow">
              Clinic Schedule
            </span>
            <h1>Schedule</h1>
          </div>
        </div>

        <div className="schedule-calendar">
          <div className="schedule-loading">
            Loading schedule…
          </div>
        </div>
      </div>
    );
  }

  if (error && !configuration) {
    return (
      <div className="schedule-page">
        <div className="schedule-header">
          <div>
            <span className="schedule-eyebrow">
              Clinic Schedule
            </span>
            <h1>Schedule</h1>
          </div>
        </div>

        <div className="schedule-form-error">
          {error}
        </div>
      </div>
    );
  }

  if (!configuration) {
    return null;
  }

  const selectedPatient =
    patientContextId
      ? patientsById[
          patientContextId
        ]
      : undefined;

  const gridStyle = {
    "--service-area-count":
      Math.max(
        activeServiceAreas.length,
        1,
      ),
  } as CSSProperties;

  const interaction =
    interactionRef.current;

  const previewAppointmentId =
    activeInteractionAppointmentId;

  const previewAreaId =
    interaction &&
    interaction.mode === "drag"
      ? (
          interaction as DragInteraction & {
            previewAreaId?: string;
          }
        ).previewAreaId
      : undefined;

  const previewStartMinutes =
    interaction &&
    interaction.mode === "drag"
      ? (
          interaction as DragInteraction & {
            previewStartMinutes?: number;
          }
        ).previewStartMinutes
      : undefined;

  const previewValid =
    interaction &&
    interaction.mode === "drag"
      ? (
          interaction as DragInteraction & {
            previewValid?: boolean;
          }
        ).previewValid
      : false;

  const previewDuration =
    interaction &&
    interaction.mode === "resize"
      ? (
          interaction as DragInteraction & {
            previewDurationMinutes?: number;
          }
        ).previewDurationMinutes ??
        interaction.originalDurationMinutes
      : interaction?.originalDurationMinutes;

  return (
    <div className="schedule-page">
      <div className="schedule-header">
        <div>
          <span className="schedule-eyebrow">
            Clinic Schedule
          </span>
          <h1>Schedule</h1>
        </div>

        <div className="schedule-controls">
          <button
            type="button"
            className="icon-button"
            onClick={() =>
              void loadDate(
                addDays(
                  selectedDate,
                  -1,
                ),
              )
            }
            aria-label="Previous day"
          >
            ‹
          </button>

          <input
            className="date-picker"
            type="date"
            value={selectedDate}
            onChange={(event) =>
              void loadDate(
                event.target.value,
              )
            }
          />

          <button
            type="button"
            className="icon-button"
            onClick={() =>
              void loadDate(
                addDays(
                  selectedDate,
                  1,
                ),
              )
            }
            aria-label="Next day"
          >
            ›
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              void loadDate(
                todayString(),
              )
            }
          >
            Today
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={() =>
              openCreateModal()
            }
          >
            Add Appointment
          </button>
        </div>
      </div>

      <div className="schedule-date">
        {formatDate(selectedDate)}
      </div>

      {patientContextId && (
        <div className="schedule-patient-context">
          <div>
            <span className="schedule-patient-context-label">
              Scheduling patient
            </span>

            <strong>
              {selectedPatient
                ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                : "Loading patient…"}
            </strong>
          </div>

          <button
            type="button"
            className="schedule-patient-context-clear"
            onClick={
              clearPatientContext
            }
          >
            Clear patient
          </button>
        </div>
      )}

      {error && (
        <div className="schedule-form-error">
          {error}
        </div>
      )}

      {activeServiceAreas.length ===
      0 ? (
        <div className="schedule-calendar">
          <div className="schedule-empty">
            No active service areas are configured.
          </div>
        </div>
      ) : (
        <div className="schedule-calendar">
          <div
            className="schedule-grid"
            style={gridStyle}
          >
            <div className="time-column-header" />

            {activeServiceAreas.map(
              (area) => {
                const assignment =
                  dayData.assignments.find(
                    (item) =>
                      item.serviceAreaId ===
                      area.id,
                  );

                const provider =
                  assignment
                    ? providerById.get(
                        assignment.providerId,
                      )
                    : undefined;

                const providerServices =
                  provider
                    ? provider.serviceIds
                        .map((id) =>
                          serviceById.get(
                            id,
                          ),
                        )
                        .filter(
                          (
                            service,
                          ): service is Service =>
                            Boolean(
                              service?.active,
                            ),
                        )
                        .sort(
                          (
                            a,
                            b,
                          ) =>
                            a.displayOrder -
                            b.displayOrder,
                        )
                    : [];

                return (
                  <div
                    key={area.id}
                    className="service-area-header"
                  >
                    <strong>
                      {area.name}
                    </strong>

                    <div className="service-area-provider">
                      {provider
                        ? provider.name
                        : "No provider assigned"}
                    </div>

                    {providerServices.length >
                      0 && (
                      <div className="service-area-services">
                        {providerServices.map(
                          (
                            service,
                            index,
                          ) => (
                            <span
                              key={
                                service.id
                              }
                              className={`service-area-service ${
                                index ===
                                0
                                  ? "primary"
                                  : ""
                              }`}
                            >
                              {
                                service.name
                              }
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )}

            <div className="time-column">
              {Array.from(
                {
                  length:
                    (DAY_END -
                      DAY_START) /
                    SLOT_MINUTES,
                },
                (_, index) => {
                  const minutes =
                    DAY_START +
                    index *
                      SLOT_MINUTES;

                  return (
                    <div
                      key={minutes}
                      className="time-label"
                    >
                      {minutes %
                        60 ===
                      0
                        ? formatTime(
                            minutes,
                          )
                        : ""}
                    </div>
                  );
                },
              )}
            </div>

            {activeServiceAreas.map(
              (area) => {
                const assignment =
                  dayData.assignments.find(
                    (item) =>
                      item.serviceAreaId ===
                      area.id,
                  );

                const provider =
                  assignment
                    ? providerById.get(
                        assignment.providerId,
                      )
                    : undefined;

                const areaAppointments =
                  dayData.appointments.filter(
                    (appointment) =>
                      appointment.serviceAreaId ===
                      area.id,
                  );

                const availability =
                  provider
                    ? dayData.availability.find(
                        (item) =>
                          item.providerId ===
                          provider.id,
                      )
                    : undefined;

                return (
                  <div
                    key={area.id}
                    className="service-area-column"
                    data-service-area-id={
                      area.id
                    }
                  >
                    {Array.from(
                      {
                        length:
                          (DAY_END -
                            DAY_START) /
                          SLOT_MINUTES,
                      },
                      (_, index) => {
                        const start =
                          DAY_START +
                          index *
                            SLOT_MINUTES;

                        const hasAvailability =
                          Boolean(
                            provider &&
                              availability?.blocks.some(
                                (
                                  block,
                                ) =>
                                  start >=
                                    block.startMinutes &&
                                  start +
                                    SLOT_MINUTES <=
                                    block.endMinutes,
                              ),
                          );

                        const hasAnyService =
                          provider
                            ? getServicesForArea(
                                area.id,
                                dayData,
                                configuration,
                              ).some(
                                (
                                  service,
                                ) =>
                                  isRangeAvailable(
                                    area.id,
                                    service.id,
                                    start,
                                    Math.max(
                                      SLOT_MINUTES,
                                      service.defaultDurationMinutes,
                                    ),
                                    dayData,
                                    configuration,
                                  ),
                              )
                            : false;

                        const available =
                          hasAvailability &&
                          hasAnyService;

                        return (
                          <button
                            key={start}
                            type="button"
                            className={`schedule-slot ${
                              available
                                ? "available"
                                : "unavailable"
                            }`}
                            disabled={
                              !available
                            }
                            onClick={() =>
                              openCreateModal(
                                area.id,
                                start,
                              )
                            }
                            aria-label={`${area.name}, ${formatTime(start)}`}
                          />
                        );
                      },
                    )}

                    {areaAppointments.map(
                      (appointment) => {
                        const isBeingDragged =
                          previewAppointmentId ===
                          appointment.id;

                        const isPreviewTarget =
                          isBeingDragged &&
                          previewAreaId ===
                            area.id &&
                          previewValid;

                        if (
                          isBeingDragged &&
                          previewAreaId !==
                            area.id
                        ) {
                          return null;
                        }

                        if (
                          isBeingDragged &&
                          !previewValid
                        ) {
                          return null;
                        }

                        const start =
                          isPreviewTarget &&
                          previewStartMinutes !==
                            undefined
                            ? previewStartMinutes
                            : appointment.startMinutes;

                        const duration =
                          isBeingDragged &&
                          previewDuration !==
                            undefined
                            ? previewDuration
                            : appointment.durationMinutes;

                        const top =
                          ((start -
                            DAY_START) /
                            SLOT_MINUTES) *
                          SLOT_HEIGHT;

                        const height =
                          Math.max(
                            SLOT_HEIGHT,
                            (duration /
                              SLOT_MINUTES) *
                              SLOT_HEIGHT,
                          );

                        const service =
                          serviceById.get(
                            appointment.serviceId,
                          );

                        return (
                          <button
                            key={
                              appointment.id
                            }
                            type="button"
                            className={`appointment-card ${
                              isBeingDragged
                                ? "dragging"
                                : ""
                            }`}
                            style={{
                              top,
                              height,
                            }}
                            onPointerDown={(
                              event,
                            ) =>
                              beginAppointmentInteraction(
                                event,
                                appointment,
                                "drag",
                              )
                            }
                            onClick={() =>
                              handleAppointmentClick(
                                appointment,
                              )
                            }
                          >
                            <strong>
                              {getPatientName(
                                appointment.patientId,
                              )}
                            </strong>

                            <span className="appointment-service">
                              {service?.name ??
                                appointment.serviceId}
                            </span>

                            <span className="appointment-time">
                              {formatTime(
                                start,
                              )}{" "}
                              –
                              {formatTime(
                                start +
                                  duration,
                              )}
                            </span>

                            <span
                              className="appointment-resize-handle"
                              onPointerDown={(
                                event,
                              ) => {
                                event.stopPropagation();

                                beginAppointmentInteraction(
                                  event,
                                  appointment,
                                  "resize",
                                );
                              }}
                            />
                          </button>
                        );
                      },
                    )}

                    {isBeingPreviewedInAnotherArea(
                      previewAppointmentId,
                      area.id,
                      previewAreaId,
                    ) &&
                      previewValid &&
                      interaction &&
                      previewStartMinutes !==
                        undefined && (
                        <div
                          className="appointment-card drag-preview"
                          style={{
                            top:
                              ((previewStartMinutes -
                                DAY_START) /
                                SLOT_MINUTES) *
                              SLOT_HEIGHT,
                            height:
                              Math.max(
                                SLOT_HEIGHT,
                                (interaction
                                  .originalDurationMinutes /
                                  SLOT_MINUTES) *
                                  SLOT_HEIGHT,
                              ),
                          }}
                        >
                          <strong>
                            {getPatientName(
                              interaction
                                .appointment
                                .patientId,
                            )}
                          </strong>

                          <span className="appointment-service">
                            {serviceById.get(
                              interaction
                                .appointment
                                .serviceId,
                            )?.name ??
                              interaction
                                .appointment
                                .serviceId}
                          </span>

                          <span className="appointment-time">
                            {formatTime(
                              previewStartMinutes,
                            )}{" "}
                            –
                            {formatTime(
                              previewStartMinutes +
                                interaction
                                  .originalDurationMinutes,
                            )}
                          </span>
                        </div>
                      )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {dragError && (
        <div className="schedule-drag-error">
          {dragError}
        </div>
      )}

      {pendingMove && (
        <div className="schedule-modal-backdrop">
          <div
            className="schedule-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>Move appointment?</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  cancelPendingMove
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="appointment-summary">
              <strong>
                {getPatientName(
                  pendingMove
                    .appointment
                    .patientId,
                )}
              </strong>

              <span>
                {
                  serviceById.get(
                    pendingMove
                      .appointment
                      .serviceId,
                  )?.name
                }
              </span>

              <span>
                {
                  activeServiceAreas.find(
                    (area) =>
                      area.id ===
                      pendingMove.serviceAreaId,
                  )?.name
                }{" "}
                at{" "}
                {formatTime(
                  pendingMove.startMinutes,
                )}
              </span>

              <span>
                Provider:{" "}
                {getAssignedProvider(
                  pendingMove.serviceAreaId,
                  dayData,
                )?.name ??
                  "Unassigned"}
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  cancelPendingMove
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={
                  confirmPendingMove
                }
              >
                Move Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDraft && (
        <div className="schedule-modal-backdrop">
          <div
            className="schedule-modal"
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <div>
                <h2>
                  {modalDraft.id
                    ? "Edit Appointment"
                    : "New Appointment"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <label>
              Patient
              <input
                value={
                  modalDraft.patientId
                    ? getPatientName(
                        modalDraft.patientId,
                      )
                    : patientSearch
                }
                onChange={(event) => {
                  if (
                    modalDraft.patientId
                  ) {
                    setModalDraft(
                      (current) =>
                        current
                          ? {
                              ...current,
                              patientId:
                                "",
                            }
                          : current,
                    );
                  }

                  setPatientSearch(
                    event.target.value,
                  );
                }}
                placeholder="Search by name, phone, email, or patient number"
                autoComplete="off"
              />

              {modalDraft.patientId && (
                <button
                  type="button"
                  className="patient-clear"
                  onClick={() => {
                    setModalDraft(
                      (current) =>
                        current
                          ? {
                              ...current,
                              patientId:
                                "",
                            }
                          : current,
                    );
                    setPatientSearch(
                      "",
                    );
                  }}
                >
                  Change patient
                </button>
              )}

              {!modalDraft.patientId &&
                patientSearch.trim()
                  .length >= 2 && (
                  <div className="patient-search-results">
                    {patientSearchLoading ? (
                      <div className="patient-search-message">
                        Searching…
                      </div>
                    ) : patientSearchResults.length >
                      0 ? (
                      patientSearchResults.map(
                        (
                          patient,
                        ) => (
                          <button
                            key={
                              patient.id
                            }
                            type="button"
                            className="patient-search-result"
                            onClick={() => {
                              setModalDraft(
                                (
                                  current,
                                ) =>
                                  current
                                    ? {
                                        ...current,
                                        patientId:
                                          patient.id,
                                        bookingStatus:
                                          bookingStatuses.some(
                                            (
                                              status,
                                            ) =>
                                              status.id ===
                                              patient.bookingStatus,
                                          )
                                            ? patient.bookingStatus
                                            : current.bookingStatus,
                                      }
                                    : current,
                              );

                              setPatientSearch(
                                "",
                              );
                              setPatientSearchResults(
                                [],
                              );
                            }}
                          >
                            <strong>
                              {
                                patient.firstName
                              }{" "}
                              {
                                patient.lastName
                              }
                            </strong>

                            <span>
                              {
                                patient.patientNumber
                              }
                            </span>
                          </button>
                        ),
                      )
                    ) : (
                      <div className="patient-search-message">
                        No patients found.
                      </div>
                    )}
                  </div>
                )}
            </label>

            <div className="modal-grid">
              <label>
                Date
                <input
                  type="date"
                  value={
                    modalDraft.date
                  }
                  onChange={(event) =>
                    handleDraftDateChange(
                      event.target.value,
                    )
                  }
                />
              </label>

              <label>
                Time
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={minutesToTimeInput(
                    modalDraft.startMinutes,
                  )}
                  onChange={(event) =>
                    setModalDraft(
                      (current) =>
                        current
                          ? {
                              ...current,
                              startMinutes:
                                timeInputToMinutes(
                                  event
                                    .target
                                    .value,
                                ),
                            }
                          : current,
                    )
                  }
                />
              </label>
            </div>

            <label>
              Service area
              <select
                value={
                  modalDraft.serviceAreaId
                }
                onChange={(event) =>
                  handleDraftAreaChange(
                    event.target.value,
                  )
                }
                disabled={
                  modalDayLoading
                }
              >
                {activeServiceAreas.map(
                  (area) => {
                    const provider =
                      getAssignedProvider(
                        area.id,
                        modalDayData,
                      );

                    return (
                      <option
                        key={area.id}
                        value={area.id}
                      >
                        {area.name}
                        {provider
                          ? ` — ${provider.name}`
                          : " — Unassigned"}
                      </option>
                    );
                  },
                )}
              </select>
            </label>

            <label>
              Service
              <select
                value={
                  modalDraft.serviceId
                }
                onChange={(event) =>
                  setModalDraft(
                    (current) =>
                      current
                        ? {
                            ...current,
                            serviceId:
                              event
                                .target
                                .value,
                          }
                        : current,
                  )
                }
                disabled={
                  modalDayLoading ||
                  !modalDayData
                }
              >
                {modalDayData &&
                  getServicesForArea(
                    modalDraft.serviceAreaId,
                    modalDayData,
                    configuration,
                  ).map(
                    (service) => (
                      <option
                        key={service.id}
                        value={service.id}
                      >
                        {service.name}
                      </option>
                    ),
                  )}
              </select>
            </label>

            <div className="modal-grid">
              <label>
                Duration
                <input
                  type="number"
                  min={1}
                  value={
                    modalDraft.durationMinutes
                  }
                  onChange={(event) =>
                    setModalDraft(
                      (current) =>
                        current
                          ? {
                              ...current,
                              durationMinutes:
                                Math.max(
                                  1,
                                  Number(
                                    event
                                      .target
                                      .value,
                                  ),
                                ),
                            }
                          : current,
                    )
                  }
                />
              </label>

              <label>
                Booking status
                <select
                  value={
                    modalDraft.bookingStatus
                  }
                  onChange={(event) =>
                    setModalDraft(
                      (current) =>
                        current
                          ? {
                              ...current,
                              bookingStatus:
                                event
                                  .target
                                  .value,
                            }
                          : current,
                    )
                  }
                >
                  {bookingStatuses.map(
                    (status) => (
                      <option
                        key={status.id}
                        value={status.id}
                      >
                        {status.name}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            {modalDayLoading && (
              <div className="patient-search-message">
                Loading schedule information…
              </div>
            )}

            {modalError && (
              <p className="schedule-form-error">
                {modalError}
              </p>
            )}

            <div className="modal-actions">
              {modalDraft.id && (
                <button
                  type="button"
                  className="secondary-button modal-delete-button"
                  onClick={
                    removeAppointment
                  }
                  disabled={saving}
                >
                  Delete
                </button>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={saveDraft}
                disabled={
                  saving ||
                  modalDayLoading
                }
              >
                {saving
                  ? "Saving…"
                  : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function isBeingPreviewedInAnotherArea(
  previewAppointmentId:
    | string
    | null,
  areaId: string,
  previewAreaId:
    | string
    | undefined,
): boolean {
  return Boolean(
    previewAppointmentId &&
      previewAreaId &&
      previewAreaId === areaId,
  );
}