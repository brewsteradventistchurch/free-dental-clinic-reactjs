import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getConfiguration,
  updateProviders,
  updateServices,
  updateServiceAreas,
} from "../api/configurationApi";
import {
  deleteProviderAvailability,
  deleteServiceAreaAssignment,
  getProviderAvailability,
  getServiceAreaAssignments,
  saveProviderAvailability,
  saveServiceAreaAssignment,
} from "../api/scheduling";
import type {
  ClinicConfiguration,
  Provider,
  ProviderAvailability,
  Service,
  ServiceArea,
  ServiceAreaAssignment,
} from "../schedule/types";
import "./ConfigPage.css";

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatShortDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0",
  )}`;
}

function fromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function todayString() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sortServices(services: Service[]) {
  return [...services].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

function sortProviders(providers: Provider[]) {
  return [...providers].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

function sortServiceAreas(serviceAreas: ServiceArea[]) {
  return [...serviceAreas].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );
}

type AvailabilityRow = {
  availabilityId: string;
  providerId: string;
  date: string;
  blockIndex: number;
  startMinutes: number;
  endMinutes: number;
};

export default function ConfigPage() {
  const { user } = useAuth();

  const [configuration, setConfiguration] =
    useState<ClinicConfiguration | null>(null);

  const [providerAvailability, setProviderAvailability] =
    useState<ProviderAvailability[]>([]);

  const [serviceAreaAssignments, setServiceAreaAssignments] =
    useState<ServiceAreaAssignment[]>([]);

  const [assignmentDate, setAssignmentDate] =
    useState(todayString());

  const [assignmentsLoading, setAssignmentsLoading] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [section, setSection] = useState<
    "services" | "providers" | "serviceAreas"
  >("services");

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [serviceDurationDraft, setServiceDurationDraft] =
    useState("");

  const [editingProvider, setEditingProvider] =
    useState<Provider | null>(null);

  const [expandedProviders, setExpandedProviders] =
    useState<Set<string>>(new Set());

  const [editingServiceArea, setEditingServiceArea] =
    useState<ServiceArea | null>(null);

  const [addingAvailabilityFor, setAddingAvailabilityFor] =
    useState<string | null>(null);

  const [availabilityDraft, setAvailabilityDraft] = useState({
    date: todayString(),
    startMinutes: 8 * 60,
    endMinutes: 12 * 60,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");

      try {
        const [result, availability] = await Promise.all([
          getConfiguration(),
          getProviderAvailability(),
        ]);

        if (cancelled) {
          return;
        }

        setConfiguration({
          ...result,
          services: sortServices(result.services),
          providers: sortProviders(result.providers),
          serviceAreas: sortServiceAreas(result.serviceAreas),
        });

        setProviderAvailability(availability);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load clinic configuration.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAssignments() {
      setAssignmentsLoading(true);
      setError("");

      try {
        const assignments =
          await getServiceAreaAssignments(
            assignmentDate,
          );

        if (!cancelled) {
          setServiceAreaAssignments(assignments);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load provider assignments.",
          );
        }
      } finally {
        if (!cancelled) {
          setAssignmentsLoading(false);
        }
      }
    }

    void loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [assignmentDate]);

  if (user?.role.toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div className="config-page">
        <div className="page-heading">
          <span className="eyebrow">Configuration</span>
          <h1>Clinic setup</h1>
        </div>

        <div className="admin-panel">
          <p>Loading clinic configuration…</p>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="config-page">
        <div className="page-heading">
          <span className="eyebrow">Configuration</span>
          <h1>Clinic setup</h1>
        </div>

        <div className="admin-panel">
          <div
            className="admin-message error"
            role="alert"
          >
            {error || "Unable to load clinic configuration."}
          </div>
        </div>
      </div>
    );
  }

  const currentConfiguration = configuration;

  async function saveServices(
    services: Service[],
  ): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const saved = await updateServices(
        sortServices(services),
      );

      setConfiguration({
        ...saved,
        services: sortServices(saved.services),
        providers: sortProviders(saved.providers),
        serviceAreas: sortServiceAreas(saved.serviceAreas),
      });

      setMessage("Services saved.");

      window.setTimeout(() => setMessage(""), 2200);

      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save services.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveProviders(
    providers: Provider[],
  ): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const saved = await updateProviders(
        sortProviders(providers),
      );

      setConfiguration({
        ...saved,
        services: sortServices(saved.services),
        providers: sortProviders(saved.providers),
        serviceAreas: sortServiceAreas(saved.serviceAreas),
      });

      setMessage("Providers saved.");

      window.setTimeout(() => setMessage(""), 2200);

      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save providers.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveServiceAreas(
    serviceAreas: ServiceArea[],
  ): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const saved = await updateServiceAreas(
        sortServiceAreas(serviceAreas),
      );

      setConfiguration({
        ...saved,
        services: sortServices(saved.services),
        providers: sortProviders(saved.providers),
        serviceAreas: sortServiceAreas(saved.serviceAreas),
      });

      setMessage("Service areas saved.");

      window.setTimeout(() => setMessage(""), 2200);

      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save service areas.",
      );

      return false;
    } finally {
      setSaving(false);
    }
  }

  function availabilityFor(
    providerId: string,
  ): ProviderAvailability[] {
    return providerAvailability
      .filter(
        (item) => item.providerId === providerId,
      )
      .sort((a, b) =>
        a.date.localeCompare(b.date),
      );
  }

  function availabilityRowsFor(
    providerId: string,
  ): AvailabilityRow[] {
    return availabilityFor(providerId)
      .flatMap((item) =>
        item.blocks.map(
          (block, blockIndex) => ({
            availabilityId: item.id,
            providerId: item.providerId,
            date: item.date,
            blockIndex,
            startMinutes: block.startMinutes,
            endMinutes: block.endMinutes,
          }),
        ),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.startMinutes - b.startMinutes,
      );
  }

    function assignmentForServiceArea(
    serviceAreaId: string,
  ): ServiceAreaAssignment | undefined {
    return serviceAreaAssignments.find(
      (assignment) =>
        assignment.serviceAreaId ===
        serviceAreaId,
    );
  }

  function providerHasAvailability(
    providerId: string,
    date: string,
  ): boolean {
    return providerAvailability.some(
      (availability) =>
        availability.providerId === providerId &&
        availability.date === date &&
        availability.blocks.length > 0,
    );
  }

  async function changeServiceAreaAssignment(
    serviceAreaId: string,
    providerId: string,
  ) {
    setSaving(true);
    setError("");

    try {
      if (!providerId) {
        await deleteServiceAreaAssignment(
          serviceAreaId,
          assignmentDate,
        );

        setServiceAreaAssignments(
          (current) =>
            current.filter(
              (assignment) =>
                !(
                  assignment.serviceAreaId ===
                    serviceAreaId &&
                  assignment.date ===
                    assignmentDate
                ),
            ),
        );

        setMessage("Provider assignment removed.");
      } else {
        const saved =
          await saveServiceAreaAssignment(
            serviceAreaId,
            providerId,
            assignmentDate,
          );

        setServiceAreaAssignments(
          (current) => [
            ...current.filter(
              (assignment) =>
                !(
                  assignment.serviceAreaId ===
                    serviceAreaId &&
                  assignment.date ===
                    assignmentDate
                ),
            ),
            saved,
          ],
        );

        setMessage("Provider assignment saved.");
      }

      window.setTimeout(
        () => setMessage(""),
        2200,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save provider assignment.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openServiceEditor(service: Service) {
    setEditingService({ ...service });
    setServiceDurationDraft(
      String(service.defaultDurationMinutes),
    );
  }

  function addService() {
    const maxOrder =
      currentConfiguration.services.reduce(
        (max, service) =>
          Math.max(max, service.displayOrder),
        -1,
      );

    const id = `service-${crypto.randomUUID()}`;

    setEditingService({
      id,
      name: "",
      defaultDurationMinutes: 60,
      active: true,
      displayOrder: maxOrder + 1,
    });

    setServiceDurationDraft("60");
    setSection("services");
  }

  function closeServiceEditor() {
    setEditingService(null);
    setServiceDurationDraft("");
  }

  function normalizeDurationOnBlur() {
    const parsed = Number.parseInt(
      serviceDurationDraft,
      10,
    );

    if (!Number.isFinite(parsed) || parsed < 20) {
      setServiceDurationDraft("20");
      return;
    }

    setServiceDurationDraft(
      String(Math.round(parsed / 20) * 20),
    );
  }

  async function saveServiceEdit() {
    if (!editingService) {
      return;
    }

    const name = editingService.name.trim();

    if (!name) {
      setError("Please enter a service name.");
      return;
    }

    const parsedDuration = Number.parseInt(
      serviceDurationDraft,
      10,
    );

    if (
      !Number.isFinite(parsedDuration) ||
      parsedDuration < 20
    ) {
      setError("Duration must be at least 20 minutes.");
      return;
    }

    const savedService: Service = {
      ...editingService,
      name,
      defaultDurationMinutes:
        Math.round(parsedDuration / 20) * 20,
    };

    const exists =
      currentConfiguration.services.some(
        (service) =>
          service.id === savedService.id,
      );

    const services = exists
      ? currentConfiguration.services.map(
          (service) =>
            service.id === savedService.id
              ? savedService
              : service,
        )
      : [
          ...currentConfiguration.services,
          savedService,
        ];

    const success = await saveServices(services);

    if (success) {
      closeServiceEditor();
    }
  }

  async function deleteService(id: string) {
    const used =
      currentConfiguration.providers.some(
        (provider) =>
          provider.serviceIds.includes(id),
      );

    if (used) {
      setError(
        "Remove this service from its providers before deleting it.",
      );
      return;
    }

    const success = await saveServices(
      currentConfiguration.services.filter(
        (service) => service.id !== id,
      ),
    );

    if (
      success &&
      editingService?.id === id
    ) {
      closeServiceEditor();
    }
  }

  function openProviderEditor(
    provider: Provider,
  ) {
    setEditingProvider({
      ...provider,
      serviceIds: [...provider.serviceIds],
    });
  }

  function addProvider() {
    const maxOrder =
      currentConfiguration.providers.reduce(
        (max, provider) =>
          Math.max(max, provider.displayOrder),
        -1,
      );

    const id = `provider-${crypto.randomUUID()}`;

    setEditingProvider({
      id,
      name: "",
      serviceIds: [],
      active: true,
      displayOrder: maxOrder + 1,
    });

    setSection("providers");

    setExpandedProviders(
      (current) =>
        new Set(current).add(id),
    );
  }

  function closeProviderEditor() {
    setEditingProvider(null);
  }

  async function saveProviderEdit() {
    if (!editingProvider) {
      return;
    }

    const name = editingProvider.name.trim();

    if (!name) {
      setError("Please enter the provider name.");
      return;
    }

    const savedProvider: Provider = {
      ...editingProvider,
      name,
    };

    const exists =
      currentConfiguration.providers.some(
        (provider) =>
          provider.id === savedProvider.id,
      );

    const providers = exists
      ? currentConfiguration.providers.map(
          (provider) =>
            provider.id === savedProvider.id
              ? savedProvider
              : provider,
        )
      : [
          ...currentConfiguration.providers,
          savedProvider,
        ];

    const success =
      await saveProviders(providers);

    if (success) {
      closeProviderEditor();
    }
  }

  function toggleDraftProviderService(
    serviceId: string,
  ) {
    if (!editingProvider) {
      return;
    }

    const serviceIds =
      editingProvider.serviceIds.includes(
        serviceId,
      )
        ? editingProvider.serviceIds.filter(
            (id) => id !== serviceId,
          )
        : [
            ...editingProvider.serviceIds,
            serviceId,
          ];

    setEditingProvider({
      ...editingProvider,
      serviceIds,
    });
  }

  function toggleProviderExpanded(
    providerId: string,
  ) {
    setExpandedProviders((current) => {
      const next = new Set(current);

      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }

      return next;
    });
  }

  async function moveProvider(
    providerId: string,
    direction: -1 | 1,
  ) {
    const providers = sortProviders(
      currentConfiguration.providers,
    );

    const index = providers.findIndex(
      (provider) =>
        provider.id === providerId,
    );

    const targetIndex = index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= providers.length
    ) {
      return;
    }

    const reordered = [...providers];

    [reordered[index], reordered[targetIndex]] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const normalized = reordered.map(
      (provider, position) => ({
        ...provider,
        displayOrder: position,
      }),
    );

    await saveProviders(normalized);
  }

  function openServiceAreaEditor(
    serviceArea: ServiceArea,
  ) {
    setEditingServiceArea({
      ...serviceArea,
    });
  }

  function addServiceArea() {
    const maxOrder =
      currentConfiguration.serviceAreas.reduce(
        (max, serviceArea) =>
          Math.max(
            max,
            serviceArea.displayOrder,
          ),
        -1,
      );

    const id =
      `service-area-${crypto.randomUUID()}`;

    setEditingServiceArea({
      id,
      name: "",
      active: true,
      displayOrder: maxOrder + 1,
    });

    setSection("serviceAreas");
  }

  function closeServiceAreaEditor() {
    setEditingServiceArea(null);
  }

  async function saveServiceAreaEdit() {
    if (!editingServiceArea) {
      return;
    }

    const name =
      editingServiceArea.name.trim();

    if (!name) {
      setError(
        "Please enter a service area name.",
      );
      return;
    }

    const savedServiceArea: ServiceArea = {
      ...editingServiceArea,
      name,
    };

    const exists =
      currentConfiguration.serviceAreas.some(
        (serviceArea) =>
          serviceArea.id ===
          savedServiceArea.id,
      );

    const serviceAreas = exists
      ? currentConfiguration.serviceAreas.map(
          (serviceArea) =>
            serviceArea.id ===
            savedServiceArea.id
              ? savedServiceArea
              : serviceArea,
        )
      : [
          ...currentConfiguration.serviceAreas,
          savedServiceArea,
        ];

    const success =
      await saveServiceAreas(
        serviceAreas,
      );

    if (success) {
      closeServiceAreaEditor();
    }
  }

  async function deleteServiceArea(
    id: string,
  ) {
    const serviceArea =
      currentConfiguration.serviceAreas.find(
        (item) => item.id === id,
      );

    if (!serviceArea) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${serviceArea.name}"?`,
    );

    if (!confirmed) {
      return;
    }

    const remaining =
      currentConfiguration.serviceAreas
        .filter((item) => item.id !== id)
        .map((item, index) => ({
          ...item,
          displayOrder: index,
        }));

    const success =
      await saveServiceAreas(
        remaining,
      );

    if (
      success &&
      editingServiceArea?.id === id
    ) {
      closeServiceAreaEditor();
    }
  }

  async function toggleServiceAreaActive(
    serviceAreaId: string,
  ) {
    const serviceAreas =
      currentConfiguration.serviceAreas.map(
        (serviceArea) =>
          serviceArea.id === serviceAreaId
            ? {
                ...serviceArea,
                active: !serviceArea.active,
              }
            : serviceArea,
      );

    await saveServiceAreas(
      serviceAreas,
    );
  }

  async function moveServiceArea(
    serviceAreaId: string,
    direction: -1 | 1,
  ) {
    const serviceAreas =
      sortServiceAreas(
        currentConfiguration.serviceAreas,
      );

    const index =
      serviceAreas.findIndex(
        (serviceArea) =>
          serviceArea.id ===
          serviceAreaId,
      );

    const targetIndex = index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >=
        serviceAreas.length
    ) {
      return;
    }

    const reordered = [...serviceAreas];

    [reordered[index], reordered[targetIndex]] =
      [
        reordered[targetIndex],
        reordered[index],
      ];

    const normalized =
      reordered.map(
        (serviceArea, position) => ({
          ...serviceArea,
          displayOrder: position,
        }),
      );

    await saveServiceAreas(
      normalized,
    );
  }

  function beginAddAvailability(
    providerId: string,
  ) {
    const existing =
      availabilityRowsFor(providerId)[0];

    setAvailabilityDraft({
      date:
        existing?.date ??
        todayString(),
      startMinutes: 8 * 60,
      endMinutes: 12 * 60,
    });

    setAddingAvailabilityFor(
      providerId,
    );

    setExpandedProviders(
      (current) =>
        new Set(current).add(
          providerId,
        ),
    );
  }

  function cancelAddAvailability() {
    setAddingAvailabilityFor(null);
  }

  async function addAvailability(
    providerId: string,
  ) {
    if (!availabilityDraft.date) {
      setError("Please choose a date.");
      return;
    }

    if (
      availabilityDraft.endMinutes <=
      availabilityDraft.startMinutes
    ) {
      setError(
        "The end time must be after the start time.",
      );
      return;
    }

    const existing =
      providerAvailability.find(
        (item) =>
          item.providerId ===
            providerId &&
          item.date ===
            availabilityDraft.date,
      );

    const overlaps =
      existing?.blocks.some(
        (block) =>
          availabilityDraft.startMinutes <
            block.endMinutes &&
          availabilityDraft.endMinutes >
            block.startMinutes,
      ) ?? false;

    if (overlaps) {
      setError(
        "That time overlaps an existing availability block.",
      );
      return;
    }

    const updated: ProviderAvailability =
      existing
        ? {
            ...existing,
            blocks: [
              ...existing.blocks,
              {
                startMinutes:
                  availabilityDraft.startMinutes,
                endMinutes:
                  availabilityDraft.endMinutes,
              },
            ].sort(
              (a, b) =>
                a.startMinutes -
                b.startMinutes,
            ),
          }
        : {
            id:
              `availability-${crypto.randomUUID()}`,
            providerId,
            date:
              availabilityDraft.date,
            blocks: [
              {
                startMinutes:
                  availabilityDraft.startMinutes,
                endMinutes:
                  availabilityDraft.endMinutes,
              },
            ],
          };

    setSaving(true);
    setError("");

    try {
      const saved =
        await saveProviderAvailability(
          updated,
        );

      setProviderAvailability(
        (current) => {
          const withoutSaved =
            current.filter(
              (item) =>
                item.id !== saved.id,
            );

          return [
            ...withoutSaved,
            saved,
          ];
        },
      );

      setAddingAvailabilityFor(
        null,
      );

      setMessage(
        "Availability saved.",
      );

      window.setTimeout(
        () => setMessage(""),
        2200,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save provider availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateAvailability(
    row: AvailabilityRow,
    patch: {
      startMinutes?: number;
      endMinutes?: number;
    },
  ) {
    const availability =
      providerAvailability.find(
        (item) =>
          item.id === row.availabilityId,
      );

    if (!availability) {
      return;
    }

    const currentBlock =
      availability.blocks[
        row.blockIndex
      ];

    if (!currentBlock) {
      return;
    }

    const updatedBlock = {
      ...currentBlock,
      ...patch,
    };

    if (
      updatedBlock.endMinutes <=
      updatedBlock.startMinutes
    ) {
      setError(
        "The end time must be after the start time.",
      );
      return;
    }

    const overlaps =
      availability.blocks.some(
        (block, index) => {
          if (
            index ===
            row.blockIndex
          ) {
            return false;
          }

          return (
            updatedBlock.startMinutes <
              block.endMinutes &&
            updatedBlock.endMinutes >
              block.startMinutes
          );
        },
      );

    if (overlaps) {
      setError(
        "That time overlaps an existing availability block.",
      );
      return;
    }

    const updated:
      ProviderAvailability = {
        ...availability,
        blocks:
          availability.blocks
            .map(
              (block, index) =>
                index ===
                row.blockIndex
                  ? updatedBlock
                  : block,
            )
            .sort(
              (a, b) =>
                a.startMinutes -
                b.startMinutes,
            ),
      };

    setSaving(true);
    setError("");

    try {
      const saved =
        await saveProviderAvailability(
          updated,
        );

      setProviderAvailability(
        (current) =>
          current.map(
            (item) =>
              item.id === saved.id
                ? saved
                : item,
          ),
      );

      setMessage(
        "Availability saved.",
      );

      window.setTimeout(
        () => setMessage(""),
        2200,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save provider availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeAvailability(
    row: AvailabilityRow,
  ) {
    const availability =
      providerAvailability.find(
        (item) =>
          item.id === row.availabilityId,
      );

    if (!availability) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (
        availability.blocks.length ===
        1
      ) {
        await deleteProviderAvailability(
          availability.providerId,
          availability.date,
        );

        setProviderAvailability(
          (current) =>
            current.filter(
              (item) =>
                item.id !==
                availability.id,
            ),
        );
      } else {
        const updated:
          ProviderAvailability = {
            ...availability,
            blocks:
              availability.blocks.filter(
                (
                  _,
                  index,
                ) =>
                  index !==
                  row.blockIndex,
              ),
          };

        const saved =
          await saveProviderAvailability(
            updated,
          );

        setProviderAvailability(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                saved.id
                  ? saved
                  : item,
            ),
        );
      }

      setMessage(
        "Availability updated.",
      );

      window.setTimeout(
        () => setMessage(""),
        2200,
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to remove provider availability.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="config-page">
      <div className="page-heading page-heading-row">
        <div>
          <span className="eyebrow">
            Configuration
          </span>

          <h1>Clinic setup</h1>

          <p>
            Manage services, providers,
            service areas, and provider
            availability.
          </p>
        </div>

        <span className="admin-badge">
          Admin only
        </span>
      </div>

      <div className="config-layout">
        <aside className="config-nav">
          <button
            type="button"
            className={
              section === "services"
                ? "active"
                : ""
            }
            onClick={() =>
              setSection("services")
            }
          >
            <strong>
              Services
            </strong>

            <span>
              Names and default
              durations
            </span>
          </button>

          <button
            type="button"
            className={
              section === "providers"
                ? "active"
                : ""
            }
            onClick={() =>
              setSection("providers")
            }
          >
            <strong>
              Providers
            </strong>

            <span>
              People and
              availability
            </span>
          </button>

          <button
            type="button"
            className={
              section === "serviceAreas"
                ? "active"
                : ""
            }
            onClick={() =>
              setSection("serviceAreas")
            }
          >
            <strong>
              Service Areas
            </strong>

            <span>
              Scheduler columns
            </span>
          </button>
        </aside>

        <section className="admin-panel">
          {error && (
            <div
              className="admin-message error"
              role="alert"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              className="admin-message"
              role="status"
            >
              {message}
            </div>
          )}

          {saving && (
            <div
              className="admin-message"
              role="status"
            >
              Saving…
            </div>
          )}

          {section === "services" && (
            <>
              <div className="admin-panel-header">
                <div>
                  <h2>Services</h2>

                  <p>
                    These are the
                    services staff can
                    schedule. Duration
                    is the default
                    appointment length.
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={addService}
                  disabled={saving}
                >
                  + Add service
                </button>
              </div>

              <div className="admin-list">
                {sortServices(
                  currentConfiguration.services,
                ).map(
                  (service) => (
                    <div
                      className="admin-list-row"
                      key={service.id}
                    >
                      <div>
                        <strong>
                          {service.name}
                        </strong>

                        <span>
                          {
                            service.defaultDurationMinutes
                          }{" "}
                          minute
                          default
                        </span>
                      </div>

                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openServiceEditor(
                              service,
                            )
                          }
                          disabled={saving}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            void deleteService(
                              service.id,
                            )
                          }
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}

                {!currentConfiguration
                  .services.length && (
                  <div className="availability-empty">
                    No services
                    configured yet.
                  </div>
                )}
              </div>
            </>
          )}

          {section === "providers" && (
            <>
              <div className="admin-panel-header">
                <div>
                  <h2>
                    Providers
                  </h2>

                  <p>
                    Keep providers
                    collapsed for a
                    clean overview.
                    Expand one to
                    manage services
                    and availability.
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    addProvider
                  }
                  disabled={saving}
                >
                  + Add provider
                </button>
              </div>

              <div className="admin-list">
                {sortProviders(
                  currentConfiguration.providers,
                ).map(
                  (
                    provider,
                    index,
                  ) => {
                    const expanded =
                      expandedProviders.has(
                        provider.id,
                      );

                    const availability =
                      availabilityRowsFor(
                        provider.id,
                      );

                    const orderedProviders =
                      sortProviders(
                        currentConfiguration.providers,
                      );

                    return (
                      <div
                        className={`provider-admin-card ${
                          expanded
                            ? "expanded"
                            : ""
                        }`}
                        key={
                          provider.id
                        }
                      >
                        <div className="provider-admin-heading">
                          <button
                            type="button"
                            className="provider-expand-button"
                            onClick={() =>
                              toggleProviderExpanded(
                                provider.id,
                              )
                            }
                            aria-expanded={
                              expanded
                            }
                          >
                            <span className="provider-chevron">
                              {expanded
                                ? "⌄"
                                : "›"}
                            </span>

                            <span>
                              <strong>
                                {
                                  provider.name
                                }
                              </strong>

                              <small>
                                {
                                  provider
                                    .serviceIds
                                    .length
                                }{" "}
                                {
                                  provider
                                    .serviceIds
                                    .length ===
                                  1
                                    ? "service"
                                    : "services"
                                }
                              </small>
                            </span>
                          </button>

                          <div className="provider-card-actions">
                            <button
                              type="button"
                              className="icon-order-button"
                              disabled={
                                index ===
                                  0 ||
                                saving
                              }
                              onClick={() =>
                                void moveProvider(
                                  provider.id,
                                  -1,
                                )
                              }
                              aria-label={`Move ${provider.name} up`}
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              className="icon-order-button"
                              disabled={
                                index ===
                                  orderedProviders.length -
                                    1 ||
                                saving
                              }
                              onClick={() =>
                                void moveProvider(
                                  provider.id,
                                  1,
                                )
                              }
                              aria-label={`Move ${provider.name} down`}
                            >
                              ↓
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                openProviderEditor(
                                  provider,
                                )
                              }
                              disabled={
                                saving
                              }
                            >
                              Edit
                            </button>
                          </div>
                        </div>

                        {!expanded && (
                          <div className="provider-collapsed-summary">
                            <div className="provider-service-chips compact">
                              {provider.serviceIds.length ? (
                                provider.serviceIds.map(
                                  (
                                    id,
                                  ) => (
                                    <span
                                      key={
                                        id
                                      }
                                    >
                                      {currentConfiguration.services.find(
                                        (
                                          service,
                                        ) =>
                                          service.id ===
                                          id,
                                      )?.name ??
                                        id}
                                    </span>
                                  ),
                                )
                              ) : (
                                <em>
                                  No
                                  services
                                  assigned
                                </em>
                              )}
                            </div>

                            <span className="availability-summary">
                              {
                                availability.length
                              }{" "}
                              availability{" "}
                              {
                                availability.length ===
                                1
                                  ? "block"
                                  : "blocks"
                              }
                            </span>
                          </div>
                        )}

                        {expanded && (
                          <div className="provider-expanded-content">
                            <div className="provider-service-chips">
                              {provider.serviceIds.length ? (
                                provider.serviceIds.map(
                                  (
                                    id,
                                  ) => (
                                    <span
                                      key={
                                        id
                                      }
                                    >
                                      {currentConfiguration.services.find(
                                        (
                                          service,
                                        ) =>
                                          service.id ===
                                          id,
                                      )?.name ??
                                        id}
                                    </span>
                                  ),
                                )
                              ) : (
                                <em>
                                  No
                                  services
                                  assigned
                                </em>
                              )}
                            </div>

                            <div className="availability-header">
                              <div>
                                <strong>
                                  Availability
                                </strong>

                                <span>
                                  Add separate
                                  blocks
                                  for breaks,
                                  lunch, or
                                  split
                                  shifts.
                                </span>
                              </div>

                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() =>
                                  beginAddAvailability(
                                    provider.id,
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                + Add time
                              </button>
                            </div>

                            <div className="availability-grid">
                              {availability.map(
                                (
                                  row,
                                ) => (
                                  <div
                                    className="availability-row available"
                                    key={`${row.availabilityId}-${row.blockIndex}`}
                                  >
                                    <div className="availability-date">
                                      <strong>
                                        {formatShortDate(
                                          row.date,
                                        )}
                                      </strong>

                                      <span>
                                        {formatDate(
                                          row.date,
                                        )}
                                      </span>
                                    </div>

                                    <div className="availability-times">
                                      <input
                                        type="time"
                                        value={toTime(
                                          row.startMinutes,
                                        )}
                                        onChange={(
                                          event,
                                        ) =>
                                          void updateAvailability(
                                            row,
                                            {
                                              startMinutes:
                                                fromTime(
                                                  event
                                                    .target
                                                    .value,
                                                ),
                                            },
                                          )
                                        }
                                        disabled={
                                          saving
                                        }
                                      />

                                      <span>
                                        to
                                      </span>

                                      <input
                                        type="time"
                                        value={toTime(
                                          row.endMinutes,
                                        )}
                                        onChange={(
                                          event,
                                        ) =>
                                          void updateAvailability(
                                            row,
                                            {
                                              endMinutes:
                                                fromTime(
                                                  event
                                                    .target
                                                    .value,
                                                ),
                                            },
                                          )
                                        }
                                        disabled={
                                          saving
                                        }
                                      />

                                      <button
                                        type="button"
                                        className="danger-button"
                                        onClick={() =>
                                          void removeAvailability(
                                            row,
                                          )
                                        }
                                        disabled={
                                          saving
                                        }
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ),
                              )}

                              {!availability.length &&
                                addingAvailabilityFor !==
                                  provider.id && (
                                  <div className="availability-empty">
                                    No
                                    availability
                                    configured
                                    yet. Add
                                    the first
                                    time block.
                                  </div>
                                )}
                            </div>

                            {addingAvailabilityFor ===
                              provider.id && (
                              <div className="availability-add-editor">
                                <div>
                                  <strong>
                                    Add
                                    availability
                                  </strong>

                                  <span>
                                    Choose a
                                    date and
                                    one
                                    continuous
                                    working
                                    period.
                                  </span>
                                </div>

                                <label>
                                  Date

                                  <input
                                    type="date"
                                    value={
                                      availabilityDraft.date
                                    }
                                    onChange={(
                                      event,
                                    ) =>
                                      setAvailabilityDraft(
                                        (
                                          current,
                                        ) => ({
                                          ...current,
                                          date:
                                            event
                                              .target
                                              .value,
                                        }),
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  Start

                                  <input
                                    type="time"
                                    value={toTime(
                                      availabilityDraft.startMinutes,
                                    )}
                                    onChange={(
                                      event,
                                    ) =>
                                      setAvailabilityDraft(
                                        (
                                          current,
                                        ) => ({
                                          ...current,
                                          startMinutes:
                                            fromTime(
                                              event
                                                .target
                                                .value,
                                            ),
                                        }),
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  End

                                  <input
                                    type="time"
                                    value={toTime(
                                      availabilityDraft.endMinutes,
                                    )}
                                    onChange={(
                                      event,
                                    ) =>
                                      setAvailabilityDraft(
                                        (
                                          current,
                                        ) => ({
                                          ...current,
                                          endMinutes:
                                            fromTime(
                                              event
                                                .target
                                                .value,
                                            ),
                                        }),
                                      )
                                    }
                                  />
                                </label>

                                <div className="availability-add-actions">
                                  <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                      cancelAddAvailability
                                    }
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() =>
                                      void addAvailability(
                                        provider.id,
                                      )
                                    }
                                    disabled={
                                      saving
                                    }
                                  >
                                    Add time
                                  </button>
                                </div>
                              </div>
                            )}

                            <p className="availability-note">
                              Example: Aug 21,
                              8:00 AM–12:00
                              PM and Aug 21,
                              1:00 PM–5:00 PM
                              can be entered as
                              two separate
                              blocks.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}

                {!currentConfiguration
                  .providers.length && (
                  <div className="availability-empty">
                    No providers
                    configured yet.
                  </div>
                )}
              </div>
            </>
          )}

          {section === "serviceAreas" && (
            <>
              <div className="service-area-assignment-section">
                <div className="service-area-assignment-header">
                  <div>
                    <h3>Daily provider assignments</h3>

                    <p>
                      Choose a clinic date, then assign the
                      provider working in each service area.
                      Assignments apply only to that date.
                    </p>
                  </div>

                  <label
                    className="assignment-date-label"
                    htmlFor="assignment-date"
                  >
                    Clinic date

                    <input
                      id="assignment-date"
                      type="date"
                      value={assignmentDate}
                      onChange={(event) =>
                        setAssignmentDate(
                          event.target.value,
                        )
                      }
                      disabled={
                        assignmentsLoading ||
                        saving
                      }
                    />
                  </label>
                </div>

                {assignmentsLoading ? (
                  <div className="availability-empty">
                    Loading assignments…
                  </div>
                ) : (
                  <div className="service-area-assignment-list">
                    {sortServiceAreas(
                      currentConfiguration.serviceAreas,
                    ).map((serviceArea) => {
                      const assignment =
                        assignmentForServiceArea(
                          serviceArea.id,
                        );

                      const assignedProviderId =
                        assignment?.providerId ?? "";

                      const providerOptions =
                        sortProviders(
                          currentConfiguration.providers,
                        ).filter(
                          (provider) =>
                            provider.active ||
                            provider.id ===
                              assignedProviderId,
                        );

                      const hasAvailability =
                        assignedProviderId
                          ? providerHasAvailability(
                              assignedProviderId,
                              assignmentDate,
                            )
                          : false;

                      return (
                        <div
                          className={`service-area-assignment-row ${
                            serviceArea.active
                              ? ""
                              : "inactive"
                          }`}
                          key={serviceArea.id}
                        >
                          <div className="service-area-assignment-name">
                            <strong>
                              {serviceArea.name}
                            </strong>

                            <span>
                              {serviceArea.active
                                ? "Active service area"
                                : "Inactive service area"}
                            </span>
                          </div>

                          <div className="service-area-assignment-provider">
                            <select
                              value={
                                assignedProviderId
                              }
                              onChange={(event) =>
                                void changeServiceAreaAssignment(
                                  serviceArea.id,
                                  event.target.value,
                                )
                              }
                              disabled={
                                saving ||
                                !serviceArea.active
                              }
                            >
                              <option value="">
                                Unassigned
                              </option>

                              {providerOptions.map(
                                (provider) => (
                                  <option
                                    key={provider.id}
                                    value={provider.id}
                                  >
                                    {provider.name}
                                    {!provider.active
                                      ? " (inactive)"
                                      : ""}
                                  </option>
                                ),
                              )}
                            </select>

                            {!assignedProviderId ? (
                              <span className="assignment-status">
                                No provider assigned
                              </span>
                            ) : hasAvailability ? (
                              <span className="assignment-status configured">
                                ✓ Availability configured
                              </span>
                            ) : (
                              <span className="assignment-status warning">
                                ⚠ No availability
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!currentConfiguration.serviceAreas.length && (
                      <div className="availability-empty">
                        No service areas configured yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="admin-panel-header">
                <div>
                  <h2>
                    Service Areas
                  </h2>

                  <p>
                    These are the
                    scheduling columns.
                    A provider is
                    assigned to a
                    service area for
                    each clinic date.
                  </p>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    addServiceArea
                  }
                  disabled={saving}
                >
                  + Add service area
                </button>
              </div>

              <div className="admin-list">
                {sortServiceAreas(
                  currentConfiguration.serviceAreas,
                ).map(
                  (
                    serviceArea,
                    index,
                    ordered,
                  ) => (
                    <div
                      className="admin-list-row"
                      key={
                        serviceArea.id
                      }
                    >
                      <div>
                        <strong>
                          {
                            serviceArea.name
                          }
                        </strong>

                        <span>
                          {serviceArea.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      <div className="admin-row-actions">
                        <button
                          type="button"
                          className="icon-order-button"
                          disabled={
                            index ===
                              0 ||
                            saving
                          }
                          onClick={() =>
                            void moveServiceArea(
                              serviceArea.id,
                              -1,
                            )
                          }
                          aria-label={`Move ${serviceArea.name} up`}
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          className="icon-order-button"
                          disabled={
                            index ===
                              ordered.length -
                                1 ||
                            saving
                          }
                          onClick={() =>
                            void moveServiceArea(
                              serviceArea.id,
                              1,
                            )
                          }
                          aria-label={`Move ${serviceArea.name} down`}
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            void toggleServiceAreaActive(
                              serviceArea.id,
                            )
                          }
                          disabled={saving}
                        >
                          {serviceArea.active
                            ? "Deactivate"
                            : "Activate"}
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() =>
                            openServiceAreaEditor(
                              serviceArea,
                            )
                          }
                          disabled={saving}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            void deleteServiceArea(
                              serviceArea.id,
                            )
                          }
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}

                {!currentConfiguration
                  .serviceAreas.length && (
                  <div className="availability-empty">
                    No service areas
                    configured yet.
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {editingService && (
        <div
          className="config-modal-backdrop"
          role="presentation"
        >
          <div
            className="config-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-service-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="config-modal-header">
              <div>
                <span className="config-modal-eyebrow">
                  Service
                </span>

                <h3 id="edit-service-title">
                  Edit service
                </h3>
              </div>

              <button
                type="button"
                className="config-modal-close"
                aria-label="Close"
                onClick={closeServiceEditor}
                disabled={saving}
              >
                x
              </button>
            </div>

            <label>
              Name

              <input
                autoFocus
                value={editingService.name}
                onChange={(event) =>
                  setEditingService({
                    ...editingService,
                    name: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Default duration
              (minutes)

              <input
                type="number"
                min="20"
                step="20"
                inputMode="numeric"
                value={
                  serviceDurationDraft
                }
                onChange={(event) =>
                  setServiceDurationDraft(
                    event.target.value,
                  )
                }
                onBlur={
                  normalizeDurationOnBlur
                }
              />

              <span className="field-help">
                Durations are
                adjusted in
                20-minute
                increments.
              </span>
            </label>

            <div className="config-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeServiceEditor
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void saveServiceEdit()
                }
                disabled={saving}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editingProvider && (
        <div
          className="config-modal-backdrop"
          role="presentation"
        >
          <div
            className="config-modal config-provider-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-provider-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="config-modal-header">
              <div>
                <span className="config-modal-eyebrow">
                  Provider
                </span>

                <h3 id="edit-provider-title">
                  Edit provider
                </h3>
              </div>

              <button
                type="button"
                className="config-modal-close"
                aria-label="Close"
                onClick={
                  closeProviderEditor
                }
                disabled={saving}
              >
                x
              </button>
            </div>

            <label>
              Name

              <input
                autoFocus
                value={
                  editingProvider.name
                }
                onChange={(event) =>
                  setEditingProvider({
                    ...editingProvider,
                    name: event.target.value,
                  })
                }
              />
            </label>

            <div>
              <span className="editor-label">
                Services this
                provider can
                perform
              </span>

              <div className="service-checkboxes">
                {currentConfiguration.services.map(
                  (service) => (
                    <label
                      key={
                        service.id
                      }
                    >
                      <input
                        type="checkbox"
                        checked={editingProvider.serviceIds.includes(
                          service.id,
                        )}
                        onChange={() =>
                          toggleDraftProviderService(
                            service.id,
                          )
                        }
                      />

                      {service.name}
                    </label>
                  ),
                )}
              </div>
            </div>

            <div className="config-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeProviderEditor
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void saveProviderEdit()
                }
                disabled={saving}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {editingServiceArea && (
        <div
          className="config-modal-backdrop"
          role="presentation"
        >
          <div
            className="config-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-service-area-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="config-modal-header">
              <div>
                <span className="config-modal-eyebrow">
                  Service Area
                </span>

                <h3 id="edit-service-area-title">
                  {currentConfiguration.serviceAreas.some(
                    (serviceArea) =>
                      serviceArea.id ===
                      editingServiceArea.id,
                  )
                    ? "Edit service area"
                    : "Add service area"}
                </h3>
              </div>

              <button
                type="button"
                className="config-modal-close"
                aria-label="Close"
                onClick={
                  closeServiceAreaEditor
                }
                disabled={saving}
              >
                x
              </button>
            </div>

            <label>
              Name

              <input
                autoFocus
                value={
                  editingServiceArea.name
                }
                onChange={(event) =>
                  setEditingServiceArea({
                    ...editingServiceArea,
                    name: event.target.value,
                  })
                }
              />
            </label>

            <label className="config-checkbox-label">
              <input
                type="checkbox"
                checked={
                  editingServiceArea.active
                }
                onChange={(event) =>
                  setEditingServiceArea({
                    ...editingServiceArea,
                    active:
                      event.target.checked,
                  })
                }
              />

              <span>Active</span>
            </label>

            <div className="config-modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={
                  closeServiceAreaEditor
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  void saveServiceAreaEdit()
                }
                disabled={saving}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}