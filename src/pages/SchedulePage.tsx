import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  patients,
} from "../schedule/mockScheduleData";
import { getScheduleStore, saveScheduleStore } from "../schedule/scheduleStore";
import type { Appointment, Provider } from "../schedule/types";
import "./SchedulePage.css";

const SLOT_MINUTES = 20;
const SLOT_HEIGHT = 44;

const DAY_START = 7 * 60;
const DAY_END = 18 * 60;

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(mins).padStart(2, "0")} ${period}`;
}

function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return toDateString(date);
}

function getInitialDate(): string {
  const today = toDateString(new Date());

  const futureAppointmentDates = [
    ...new Set(
      getScheduleStore().appointments
        .map((appointment) => appointment.date)
        .filter((date) => date >= today),
    ),
  ].sort();

  return futureAppointmentDates[0] ?? today;
}

function getPatientName(patientId: string): string {
  const patient = patients.find((item) => item.id === patientId);

  return patient
    ? `${patient.firstName} ${patient.lastName}`
    : "Unknown patient";
}

function getAvailabilities(
  providerId: string,
  date: string,
  availabilityList: ReturnType<typeof getScheduleStore>["providerAvailability"],
) {
  return availabilityList
    .filter(
      (availability) =>
        availability.providerId === providerId &&
        availability.date === date,
    )
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

function getAvailabilityBlockForStart(
  providerId: string,
  date: string,
  startMinutes: number,
  availabilityList: ReturnType<typeof getScheduleStore>["providerAvailability"],
) {
  return getAvailabilities(providerId, date, availabilityList).find(
    (availability) =>
      startMinutes >= availability.startMinutes &&
      startMinutes < availability.endMinutes,
  );
}

function getAvailabilityBlockForRange(
  providerId: string,
  date: string,
  startMinutes: number,
  durationMinutes: number,
  availabilityList: ReturnType<typeof getScheduleStore>["providerAvailability"],
) {
  const endMinutes = startMinutes + durationMinutes;
  return getAvailabilities(providerId, date, availabilityList).find(
    (availability) =>
      startMinutes >= availability.startMinutes &&
      endMinutes <= availability.endMinutes,
  );
}

function isAvailableAt(
  providerId: string,
  date: string,
  minutes: number,
  availabilityList: ReturnType<typeof getScheduleStore>["providerAvailability"],
) {
  return Boolean(getAvailabilityBlockForStart(providerId, date, minutes, availabilityList));
}

function hasService(provider: Provider, serviceId: string): boolean {
  return provider.serviceIds.includes(serviceId);
}

export default function SchedulePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const schedulingPatientId = searchParams.get("patientId");
  const schedulingPatient = patients.find(
    (patient) => patient.id === schedulingPatientId,
  );

  const [scheduleData] = useState(getScheduleStore);
  const [selectedDate, setSelectedDate] = useState(getInitialDate);
  const [scheduleAppointments, setScheduleAppointments] =
    useState<Appointment[]>(() => scheduleData.appointments);

  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const [draggingAppointmentId, setDraggingAppointmentId] =
    useState<string | null>(null);

  const dragStartYRef = useRef<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const originalStartMinutesRef = useRef<number | null>(null);
  const originalProviderIdRef = useRef<string | null>(null);

  const dragModeRef = useRef<"vertical" | "horizontal" | null>(null);
  const hasDraggedRef = useRef(false);
  const invalidDragMessageRef = useRef<string | null>(null);

  const [dragError, setDragError] = useState<string | null>(null);

  const [pendingProviderMove, setPendingProviderMove] =
    useState<{
      appointmentId: string;
      fromProviderId: string;
      toProviderId: string;
    } | null>(null);

  const [resizingAppointmentId, setResizingAppointmentId] =
    useState<string | null>(null);

  const resizeStartYRef = useRef<number | null>(null);
  const originalDurationRef = useRef<number | null>(null);

  const [newAppointmentDraft, setNewAppointmentDraft] = useState<{
    providerId: string;
    date: string;
    startMinutes: number;
    patientId: string;
    serviceId: string;
  } | null>(null);

  const [creationError, setCreationError] = useState<string | null>(null);

  const clinicProviders = useMemo(() => scheduleData.providers, [scheduleData.providers]);


  const providers = clinicProviders;

  function getService(serviceId: string) {
    return scheduleData.services.find((service) => service.id === serviceId);
  }

  useEffect(() => {
    saveScheduleStore({ ...scheduleData, appointments: scheduleAppointments });
  }, [scheduleAppointments]);

  function moveDate(days: number) {
    setSelectedDate((current) => addDays(current, days));
  }

  function handleSlotClick(
    provider: Provider,
    minutes: number,
  ) {
    if (!isAvailableAt(provider.id, selectedDate, minutes, scheduleData.providerAvailability)) {
      return;
    }

    const defaultServiceId = provider.serviceIds[0] ?? "";

    setCreationError(null);
    setNewAppointmentDraft({
      providerId: provider.id,
      date: selectedDate,
      startMinutes: minutes,
      patientId: schedulingPatient?.id ?? "",
      serviceId: defaultServiceId,
    });
  }

  function handleAppointmentDragStart(
    event: React.PointerEvent,
    appointment: Appointment,
  ) {
    event.stopPropagation();

    setDraggingAppointmentId(appointment.id);

    dragStartYRef.current = event.clientY;
    dragStartXRef.current = event.clientX;

    originalStartMinutesRef.current =
      appointment.startMinutes;

    originalProviderIdRef.current =
      appointment.providerId;

    dragModeRef.current = null;
    hasDraggedRef.current = false;
    invalidDragMessageRef.current = null;

    setDragError(null);

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function getProviderFromPointer(
    event: React.PointerEvent,
  ): Provider | null {
    const element = document.elementFromPoint(
      event.clientX,
      event.clientY,
    );

    const column = element?.closest(
      "[data-provider-id]",
    );

    if (!column) {
      return null;
    }

    const providerId =
      column.getAttribute("data-provider-id");

    if (!providerId) {
      return null;
    }

    return (
      providers.find(
        (provider) => provider.id === providerId,
      ) ?? null
    );
  }

  function handleAppointmentResizeStart(
    event: React.PointerEvent,
    appointment: Appointment,
  ) {
    event.stopPropagation();

    setResizingAppointmentId(appointment.id);

    resizeStartYRef.current = event.clientY;
    originalDurationRef.current = appointment.durationMinutes;

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (
      draggingAppointmentId &&
      dragStartYRef.current !== null &&
      dragStartXRef.current !== null
    ) {
      const deltaX =
        event.clientX - dragStartXRef.current;

      const deltaY =
        event.clientY - dragStartYRef.current;

      const distance = Math.sqrt(
        deltaX * deltaX + deltaY * deltaY,
      );

      /*
      * Ignore tiny pointer movements.
      * This prevents a simple click from becoming
      * a drag.
      */
      if (
        !hasDraggedRef.current &&
        distance < 8
      ) {
        return;
      }

      hasDraggedRef.current = true;

      /*
      * Once the user moves far enough, decide whether
      * this drag is primarily vertical or horizontal.
      *
      * Once chosen, the direction stays locked for
      * the remainder of this drag.
      */
      if (dragModeRef.current === null) {
        dragModeRef.current =
          Math.abs(deltaX) > Math.abs(deltaY)
            ? "horizontal"
            : "vertical";
      }

      if (dragModeRef.current === "vertical") {
        handleAppointmentMove(event);
        return;
      }

      if (dragModeRef.current === "horizontal") {
        handleProviderDrag(event);
        return;
      }
    }

    if (
      resizingAppointmentId &&
      resizeStartYRef.current !== null &&
      originalDurationRef.current !== null
    ) {
      handleAppointmentResize(event);
    }
  }

  function handleProviderDrag(
    event: React.PointerEvent,
  ) {
    if (!draggingAppointmentId) {
      return;
    }

    const appointment = scheduleAppointments.find(
      (item) => item.id === draggingAppointmentId,
    );

    if (!appointment) {
      return;
    }

    const targetProvider =
      getProviderFromPointer(event);

    if (!targetProvider) {
      return;
    }

    if (targetProvider.id === appointment.providerId) {
      setDragError(null);
      invalidDragMessageRef.current = null;
      return;
    }

    /*
    * Check whether the destination provider can perform
    * this appointment's service.
    */
    if (
      !hasService(
        targetProvider,
        appointment.serviceId,
      )
    ) {
      const service = getService(
        appointment.serviceId,
      );

      const message =
        `${targetProvider.name} does not provide ` +
        `${service?.name ?? "this service"}.`;

      setDragError(message);
      invalidDragMessageRef.current = message;

      return;
    }

    /*
    * Check whether the destination provider already
    * has an appointment during this time.
    */
    if (
      hasAppointmentConflict(
        appointment,
        targetProvider.id,
        appointment.startMinutes,
      )
    ) {
      const message =
        `${targetProvider.name} already has an ` +
        `appointment during this time.`;

      setDragError(message);
      invalidDragMessageRef.current = message;

      return;
    }

    /*
    * Valid destination.
    *
    * We don't open the confirmation dialog yet.
    * We wait until the user releases the appointment.
    */
    setDragError(null);
    invalidDragMessageRef.current = null;

    setPendingProviderMove({
      appointmentId: appointment.id,
      fromProviderId: appointment.providerId,
      toProviderId: targetProvider.id,
    });
  }

  function handleAppointmentMove(event: React.PointerEvent) {
    if (
      !draggingAppointmentId ||
      dragStartYRef.current === null ||
      originalStartMinutesRef.current === null
    ) {
      return;
    }

    const appointment = scheduleAppointments.find(
      (item) => item.id === draggingAppointmentId,
    );

    if (!appointment) {
      return;
    }

    const deltaPixels =
      event.clientY - dragStartYRef.current;

    const deltaSlots = Math.round(
      deltaPixels / SLOT_HEIGHT,
    );

    const proposedStartMinutes =
      originalStartMinutesRef.current +
      deltaSlots * SLOT_MINUTES;

    /*
    * Find the availability block that contains the proposed
    * appointment start.
    *
    * We intentionally do NOT fall back to the original block.
    * This allows providers to have multiple availability blocks
    * in one day, such as:
    *
    * 8:00 AM - 12:00 PM
    * 1:00 PM - 5:00 PM
    */
    const availability =
      getAvailabilityBlockForStart(
        appointment.providerId,
        selectedDate,
        proposedStartMinutes,
        scheduleData.providerAvailability,
      );

    /*
    * Don't allow an appointment to move into a break,
    * lunch, or unavailable period.
    */
    if (!availability) {
      return;
    }

    /*
    * The appointment must fit completely inside the
    * availability block.
    */
    const latestStart =
      availability.endMinutes -
      appointment.durationMinutes;

    if (proposedStartMinutes > latestStart) {
      return;
    }

    /*
    * The proposed position is valid.
    */
    setScheduleAppointments((current) =>
      current.map((item) =>
        item.id === appointment.id
          ? {
              ...item,
              startMinutes: proposedStartMinutes,
            }
          : item,
      ),
    );
  }

  function handleAppointmentClick(
    event: React.MouseEvent,
    appointment: Appointment,
  ) {
    event.stopPropagation();

    /*
    * A drag should never also count as a click.
    */
    if (hasDraggedRef.current) {
      return;
    }

    setSelectedAppointment(appointment);
  }

  function handleAppointmentResize(
    event: React.PointerEvent,
  ) {
    if (
      !resizingAppointmentId ||
      resizeStartYRef.current === null ||
      originalDurationRef.current === null
    ) {
      return;
    }

    const appointment = scheduleAppointments.find(
      (item) => item.id === resizingAppointmentId,
    );

    if (!appointment) {
      return;
    }

    const deltaPixels =
      event.clientY - resizeStartYRef.current;

    const deltaSlots = Math.round(
      deltaPixels / SLOT_HEIGHT,
    );

    const newDuration =
      originalDurationRef.current +
      deltaSlots * SLOT_MINUTES;

    const availability = getAvailabilityBlockForStart(
      appointment.providerId,
      selectedDate,
      appointment.startMinutes,
      scheduleData.providerAvailability,
    );

    if (!availability) {
      return;
    }

    const maximumDuration =
      availability.endMinutes - appointment.startMinutes;

    const clampedDuration = Math.max(
      SLOT_MINUTES,
      Math.min(newDuration, maximumDuration),
    );

    setScheduleAppointments((current) =>
      current.map((item) =>
        item.id === appointment.id
          ? {
              ...item,
              durationMinutes: clampedDuration,
            }
          : item,
      ),
    );
  }

  function handlePointerUp() {
    /*
    * If this was a horizontal drag with a valid target,
    * the confirmation modal will now appear because
    * draggingAppointmentId is being cleared.
    */
    setDraggingAppointmentId(null);
    setResizingAppointmentId(null);

    dragStartYRef.current = null;
    dragStartXRef.current = null;

    originalStartMinutesRef.current = null;
    originalProviderIdRef.current = null;

    resizeStartYRef.current = null;
    originalDurationRef.current = null;

    dragModeRef.current = null;
    hasDraggedRef.current = false;
    invalidDragMessageRef.current = null;

    /*
    * Don't clear pendingProviderMove here.
    * A valid horizontal move needs it for the
    * confirmation dialog.
    */
  }

  function confirmProviderMove() {
    if (!pendingProviderMove) {
      return;
    }

    const {
      appointmentId,
      toProviderId,
    } = pendingProviderMove;

    setScheduleAppointments((current) =>
      current.map((appointment) =>
        appointment.id === appointmentId
          ? {
              ...appointment,
              providerId: toProviderId,
            }
          : appointment,
      ),
    );

    setPendingProviderMove(null);
  }

  function hasAppointmentConflict(
    appointment: Appointment,
    providerId: string,
    startMinutes: number,
    date: string = selectedDate,
  ): boolean {
    const endMinutes =
      startMinutes + appointment.durationMinutes;

    return scheduleAppointments.some((other) => {
      if (other.id === appointment.id) {
        return false;
      }

      if (other.date !== date) {
        return false;
      }

      if (other.providerId !== providerId) {
        return false;
      }

      const otherEnd =
        other.startMinutes + other.durationMinutes;

      return (
        startMinutes < otherEnd &&
        endMinutes > other.startMinutes
      );
    });
  }

  function cancelProviderMove() {
    setPendingProviderMove(null);
  }

  return (
    <div
      className="schedule-page"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
    {dragError && draggingAppointmentId && (
      <div
        className="schedule-drag-error"
        role="alert"
      >
        {dragError}
      </div>
    )}
      <header className="schedule-header">
        <div>
          <span className="schedule-eyebrow">Appointments</span>
          <h1>Schedule</h1>
        </div>

        <div className="schedule-controls">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setSelectedDate(toDateString(new Date()))}
          >
            Today
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={() => moveDate(-1)}
            aria-label="Previous day"
          >
            ‹
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="date-picker"
          />

          <button
            type="button"
            className="icon-button"
            onClick={() => moveDate(1)}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
      </header>

      <div className="schedule-date">
        {formatDate(selectedDate)}
      </div>

      {schedulingPatient && (
        <div className="schedule-patient-context" role="status">
          <div>
            <span className="schedule-patient-context-label">Scheduling patient</span>
            <strong>
              {schedulingPatient.firstName} {schedulingPatient.lastName}
            </strong>
          </div>

          <button
            type="button"
            className="schedule-patient-context-clear"
            onClick={() => {
              setSearchParams({}, { replace: true });
            }}
          >
            Clear patient
          </button>
        </div>
      )}

      <section className="schedule-calendar">
        <div
          className="schedule-grid"
          style={{
            "--provider-count": clinicProviders.length,
          } as React.CSSProperties}
        >
          <div className="time-column-header" />

          {clinicProviders.map((provider, index) => (
             <div
              className="provider-header"
              key={provider.id}
              style={{ gridColumn: index + 2 }}
            >
              <strong>{provider.name}</strong>

              <div className="provider-services">
                {provider.serviceIds.map((serviceId, index) => {
                  const service = getService(serviceId);

                  if (!service) {
                    return null;
                  }

                  return (
                    <span
                      className={
                        index === 0
                          ? "provider-service primary"
                          : "provider-service"
                      }
                      key={service.id}
                    >
                      {service.name}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          <div
            className="time-column"
            style={{ gridColumn: 1, gridRow: 2 }}
          >
            {Array.from(
              {
                length:
                  (DAY_END - DAY_START) / SLOT_MINUTES,
              },
              (_, index) => {
                const minutes =
                  DAY_START + index * SLOT_MINUTES;

                return (
                  <div className="time-label" key={minutes}>
                    {minutes % 60 === 0 ? formatTime(minutes) : ""}
                  </div>
                );
              },
            )}
          </div>

          {clinicProviders.map((provider, index) => {
            const providerAvailability = getAvailabilities(provider.id, selectedDate, scheduleData.providerAvailability);

            const providerAppointments =
              scheduleAppointments.filter(
                (appointment) =>
                  appointment.date === selectedDate &&
                  appointment.providerId === provider.id,
              );

            return (
              <div
                className="provider-column"
                key={provider.id}
                data-provider-id={provider.id}
                style={{ gridColumn: index + 2 }}
              >
                {Array.from(
                  {
                    length:
                      (DAY_END - DAY_START) / SLOT_MINUTES,
                  },
                  (_, index) => {
                    const minutes =
                      DAY_START + index * SLOT_MINUTES;

                    const available = providerAvailability.some(
                      (availability) =>
                        minutes >= availability.startMinutes &&
                        minutes < availability.endMinutes,
                    );

                    return (
                      <button
                        type="button"
                        className={
                          available
                            ? "schedule-slot available"
                            : "schedule-slot unavailable"
                        }
                        key={minutes}
                        onClick={() =>
                          handleSlotClick(provider, minutes)
                        }
                        aria-label={`${provider.name} at ${formatTime(minutes)}`}
                      />
                    );
                  },
                )}

                {providerAppointments.map((appointment) => {
                  const service = getService(
                    appointment.serviceId,
                  );

                  const top =
                    ((appointment.startMinutes - DAY_START) /
                      SLOT_MINUTES) *
                    SLOT_HEIGHT;

                  const height =
                    (appointment.durationMinutes /
                      SLOT_MINUTES) *
                    SLOT_HEIGHT;

                  return (
                    <button
                      type="button"
                      key={appointment.id}
                      className={`appointment-card ${
                        draggingAppointmentId === appointment.id
                          ? "dragging"
                        : ""
                      } ${
                        resizingAppointmentId === appointment.id
                          ? "resizing"
                          : ""
                      }`}
                      style={{
                        top: `${top}px`,
                        height: `${height - 4}px`,
                      }}
                      onPointerDown={(event) =>
                        handleAppointmentDragStart(
                          event,
                          appointment,
                        )
                      }
                      onClick={(event) =>
                        handleAppointmentClick(
                          event,
                          appointment,
                        )
                      }
                    >
                      <strong>
                        {getPatientName(appointment.patientId)}
                      </strong>

                      <span className="appointment-service">
                        {service?.name}
                      </span>

                      <span className="appointment-time">
                        {formatTime(appointment.startMinutes)} –
                        {" "}
                        {formatTime(
                          appointment.startMinutes +
                            appointment.durationMinutes,
                        )}
                      </span>
                      <span
                        className="appointment-resize-handle"
                        onPointerDown={(event) =>
                          handleAppointmentResizeStart(
                            event,
                            appointment,
                          )
                        }
                        aria-label="Resize appointment"
                      />
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>

      {newAppointmentDraft && (
        <div
          className="schedule-modal-backdrop"
          onClick={() => {
            setNewAppointmentDraft(null);
            setCreationError(null);
          }}
        >
          <div
            className="schedule-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="schedule-eyebrow">
                  New appointment
                </span>
                <h2>Create appointment</h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setNewAppointmentDraft(null);
                  setCreationError(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="appointment-summary">
              <strong>
                {providers.find(
                  (provider) => provider.id === newAppointmentDraft.providerId,
                )?.name ?? "Unknown provider"}
              </strong>
              <span>{formatDate(newAppointmentDraft.date)}</span>
              <span>{formatTime(newAppointmentDraft.startMinutes)}</span>
            </div>

            <label>
              Patient
              <select
                value={newAppointmentDraft.patientId}
                onChange={(event) =>
                  setNewAppointmentDraft((current) =>
                    current
                      ? { ...current, patientId: event.target.value }
                      : current,
                  )
                }
              >
                <option value="" disabled>
                  Select patient...
                </option>

                {patients.map((patient) => (
                  <option value={patient.id} key={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Service
              <select
                value={newAppointmentDraft.serviceId}
                onChange={(event) =>
                  setNewAppointmentDraft((current) =>
                    current
                      ? { ...current, serviceId: event.target.value }
                      : current,
                  )
                }
              >
                {providers
                  .find(
                    (provider) => provider.id === newAppointmentDraft.providerId,
                  )
                  ?.serviceIds.map((serviceId) => {
                    const service = getService(serviceId);

                    if (!service) {
                      return null;
                    }

                    return (
                      <option value={service.id} key={service.id}>
                        {service.name} ({service.defaultDurationMinutes} min)
                      </option>
                    );
                  })}
              </select>
            </label>

            <div className="modal-grid">
              <label>
                Date
                <input
                  type="date"
                  value={newAppointmentDraft.date}
                  onChange={(event) =>
                    setNewAppointmentDraft((current) =>
                      current
                        ? { ...current, date: event.target.value }
                        : current,
                    )
                  }
                />
              </label>

              <label>
                Time
                <input
                  type="time"
                  step={SLOT_MINUTES * 60}
                  value={`${String(
                    Math.floor(newAppointmentDraft.startMinutes / 60),
                  ).padStart(2, "0")}:${String(
                    newAppointmentDraft.startMinutes % 60,
                  ).padStart(2, "0")}`}
                  onChange={(event) => {
                    const [hours, minutesValue] = event.target.value
                      .split(":")
                      .map(Number);

                    if (Number.isNaN(hours) || Number.isNaN(minutesValue)) {
                      return;
                    }

                    setNewAppointmentDraft((current) =>
                      current
                        ? {
                            ...current,
                            startMinutes: hours * 60 + minutesValue,
                          }
                        : current,
                    );
                  }}
                />
              </label>
            </div>

            {creationError && (
              <p className="schedule-form-error" role="alert">
                {creationError}
              </p>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setNewAppointmentDraft(null);
                  setCreationError(null);
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const provider = providers.find(
                    (item) => item.id === newAppointmentDraft.providerId,
                  );
                  const service = getService(newAppointmentDraft.serviceId);
                  const availability = provider
                    ? getAvailabilityBlockForRange(
                        provider.id,
                        newAppointmentDraft.date,
                        newAppointmentDraft.startMinutes,
                        getService(newAppointmentDraft.serviceId)?.defaultDurationMinutes ?? 0,
                        scheduleData.providerAvailability,
                      )
                    : undefined;

                  if (!newAppointmentDraft.patientId) {
                    setCreationError("Please select a patient.");
                    return;
                  }

                  if (!provider || !service) {
                    setCreationError("Please select a valid provider and service.");
                    return;
                  }

                  if (!provider.serviceIds.includes(service.id)) {
                    setCreationError(
                      `${provider.name} does not provide ${service.name}.`,
                    );
                    return;
                  }

                  const endMinutes =
                    newAppointmentDraft.startMinutes +
                    service.defaultDurationMinutes;

                  if (
                    !availability ||
                    newAppointmentDraft.startMinutes < availability.startMinutes ||
                    endMinutes > availability.endMinutes
                  ) {
                    setCreationError(
                      `This appointment does not fit within ${provider.name}'s availability.`,
                    );
                    return;
                  }

                  const appointmentForConflictCheck: Appointment = {
                    id: "new-appointment",
                    patientId: newAppointmentDraft.patientId,
                    providerId: provider.id,
                    serviceId: service.id,
                    date: newAppointmentDraft.date,
                    startMinutes: newAppointmentDraft.startMinutes,
                    durationMinutes: service.defaultDurationMinutes,
                  };

                  if (
                    hasAppointmentConflict(
                      appointmentForConflictCheck,
                      provider.id,
                      newAppointmentDraft.startMinutes,
                      newAppointmentDraft.date,
                    )
                  ) {
                    setCreationError(
                      `${provider.name} already has an appointment during this time.`,
                    );
                    return;
                  }

                  const newAppointment: Appointment = {
                    ...appointmentForConflictCheck,
                    id: `appointment-${Date.now()}`,
                  };

                  setScheduleAppointments((current) => [
                    ...current,
                    newAppointment,
                  ]);

                  setSelectedDate(newAppointment.date);
                  setNewAppointmentDraft(null);
                  setCreationError(null);
                  if (schedulingPatientId) {
                    setSearchParams({}, { replace: true });
                  }
                }}
              >
                Create appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && (
        <div
          className="schedule-modal-backdrop"
          onClick={() => setSelectedAppointment(null)}
        >
          <div
            className="schedule-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <span className="schedule-eyebrow">
                  Appointment
                </span>

                <h2>
                  {getPatientName(
                    selectedAppointment.patientId,
                  )}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setSelectedAppointment(null)}
              >
                ×
              </button>
            </div>

            <div className="appointment-summary">
              <strong>
                {
                  getService(selectedAppointment.serviceId)
                    ?.name
                }
              </strong>

              <span>
                {formatTime(selectedAppointment.startMinutes)} –
                {" "}
                {formatTime(
                  selectedAppointment.startMinutes +
                    selectedAppointment.durationMinutes,
                )}
              </span>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedAppointment(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
        {pendingProviderMove &&
         !draggingAppointmentId && (
        <div
          className="schedule-modal-backdrop"
          onClick={cancelProviderMove}
        >
        <div
          className="schedule-modal"
          onClick={(event) =>
            event.stopPropagation()
          }
        >
        <div className="modal-header">
          <div>
            <span className="schedule-eyebrow">
              Move appointment
            </span>

            <h2>Are you sure?</h2>
          </div>

          <button
            type="button"
            className="modal-close"
            onClick={cancelProviderMove}
          >
            ×
          </button>
        </div>

        <div className="appointment-summary">
          <strong>
            {
              getService(
                scheduleAppointments.find(
                  (appointment) =>
                    appointment.id ===
                    pendingProviderMove.appointmentId,
                )?.serviceId ?? "",
              )?.name
            }
          </strong>

          <span>
            {
              getPatientName(
                scheduleAppointments.find(
                  (appointment) =>
                    appointment.id ===
                    pendingProviderMove.appointmentId,
                )?.patientId ?? "",
              )
            }
          </span>

          <span>
            {
              providers.find(
                (provider) =>
                  provider.id ===
                  pendingProviderMove.fromProviderId,
              )?.name
            }
            {" → "}
            {
              providers.find(
                (provider) =>
                  provider.id ===
                  pendingProviderMove.toProviderId,
              )?.name
            }
          </span>
        </div>

        <p>
          This will move the appointment to the selected
          provider while keeping the same time.
        </p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={cancelProviderMove}
          >
            Cancel
          </button>

          <button
            type="button"
            className="primary-button"
            onClick={confirmProviderMove}
          >
            Move appointment
          </button>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}