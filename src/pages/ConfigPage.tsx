import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getConfiguration,
  updateProviders,
  updateServices,
} from "../api/configurationApi";
import {
  deleteProviderAvailability,
  getProviderAvailability,
  saveProviderAvailability,
} from "../api/scheduling";
import type {
  ClinicConfiguration,
  Provider,
  ProviderAvailability,
  Service,
} from "../schedule/types";
import "./ConfigPage.css";

function formatDate(date: string) {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(
    new Date(year, month - 1, day),
  );
}

function formatShortDate(date: string) {
  const [year, month, day] = date
    .split("-")
    .map(Number);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(
    new Date(year, month - 1, day),
  );
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(
    mins,
  ).padStart(2, "0")}`;
}

function fromTime(value: string) {
  const [hours, minutes] = value
    .split(":")
    .map(Number);

  return hours * 60 + minutes;
}

function todayString() {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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

  const [
    configuration,
    setConfiguration,
  ] = useState<ClinicConfiguration | null>(
    null,
  );

  const [
    providerAvailability,
    setProviderAvailability,
  ] = useState<ProviderAvailability[]>(
    [],
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const [section, setSection] =
    useState<"services" | "providers">(
      "services",
    );

  const [
    editingService,
    setEditingService,
  ] = useState<Service | null>(null);

  const [
    serviceDurationDraft,
    setServiceDurationDraft,
  ] = useState("");

  const [
    editingProvider,
    setEditingProvider,
  ] = useState<Provider | null>(null);

  const [
    expandedProviders,
    setExpandedProviders,
  ] = useState<Set<string>>(
    new Set(),
  );

  const [
    addingAvailabilityFor,
    setAddingAvailabilityFor,
  ] = useState<string | null>(null);

  const [
    availabilityDraft,
    setAvailabilityDraft,
  ] = useState({
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
        const result = await getConfiguration();

        if (cancelled) {
          return;
        }

        setConfiguration({
          ...result,
          services: sortServices(result.services),
          providers: sortProviders(result.providers),
        });

        const availability =
          await getProviderAvailability(
            todayString(),
          );

        if (cancelled) {
          return;
        }

        setProviderAvailability(
          availability,
        );
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

  if (
    user?.role.toLowerCase() !==
    "admin"
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  if (loading) {
    return (
      <div className="config-page">
        <div className="page-heading">
          <span className="eyebrow">
            Configuration
          </span>

          <h1>Clinic setup</h1>
        </div>

        <div className="admin-panel">
          <p>
            Loading clinic configuration…
          </p>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="config-page">
        <div className="page-heading">
          <span className="eyebrow">
            Configuration
          </span>

          <h1>Clinic setup</h1>
        </div>

        <div className="admin-panel">
          <div
            className="admin-message error"
            role="alert"
          >
            {error ||
              "Unable to load clinic configuration."}
          </div>
        </div>
      </div>
    );
  }

  const currentConfiguration =
    configuration;

  async function saveServices(
    services: Service[],
  ): Promise<boolean> {
    setSaving(true);
    setError("");

    try {
      const saved =
        await updateServices(
          sortServices(services),
        );

      setConfiguration({
        ...saved,
        services: sortServices(
          saved.services,
        ),
        providers: sortProviders(
          saved.providers,
        ),
      });

      setMessage(
        "Services saved.",
      );

      window.setTimeout(
        () => setMessage(""),
        2200,
      );

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
      const saved =
        await updateProviders(
          sortProviders(providers),
        );

      setConfiguration({
        ...saved,
        services: sortServices(
          saved.services,
        ),
        providers: sortProviders(
          saved.providers,
        ),
      });

      setMessage(
        "Providers saved.",
      );

      window.setTimeout(
        () => setMessage(""),
        2200,
      );

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

  function availabilityFor(
    providerId: string,
  ): ProviderAvailability[] {
    return providerAvailability
      .filter(
        (item) =>
          item.providerId ===
          providerId,
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date),
      );
  }

  function availabilityRowsFor(
    providerId: string,
  ): AvailabilityRow[] {
    return availabilityFor(
      providerId,
    )
      .flatMap((item) =>
        item.blocks.map(
          (
            block,
            blockIndex,
          ) => ({
            availabilityId: item.id,
            providerId:
              item.providerId,
            date: item.date,
            blockIndex,
            startMinutes:
              block.startMinutes,
            endMinutes:
              block.endMinutes,
          }),
        ),
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date,
          ) ||
          a.startMinutes -
            b.startMinutes,
      );
  }

  function openServiceEditor(
    service: Service,
  ) {
    setEditingService({
      ...service,
    });

    setServiceDurationDraft(
      String(
        service.defaultDurationMinutes,
      ),
    );
  }

  function addService() {
    const maxOrder =
      currentConfiguration.services.reduce(
        (max, service) =>
          Math.max(
            max,
            service.displayOrder,
          ),
        -1,
      );

    const id = `service-${crypto.randomUUID()}`;

    setEditingService({
      id,
      name: "",
      defaultDurationMinutes: 60,
      active: true,
      displayOrder:
        maxOrder + 1,
    });

    setServiceDurationDraft("60");
    setSection("services");
  }

  function closeServiceEditor() {
    setEditingService(null);
    setServiceDurationDraft("");
  }

  function normalizeDurationOnBlur() {
    const parsed =
      Number.parseInt(
        serviceDurationDraft,
        10,
      );

    if (
      !Number.isFinite(parsed) ||
      parsed < 20
    ) {
      setServiceDurationDraft("20");
      return;
    }

    setServiceDurationDraft(
      String(
        Math.round(
          parsed / 20,
        ) * 20,
      ),
    );
  }

  async function saveServiceEdit() {
    if (!editingService) {
      return;
    }

    const name =
      editingService.name.trim();

    if (!name) {
      setError(
        "Please enter a service name.",
      );
      return;
    }

    const parsedDuration =
      Number.parseInt(
        serviceDurationDraft,
        10,
      );

    if (
      !Number.isFinite(
        parsedDuration,
      ) ||
      parsedDuration < 20
    ) {
      setError(
        "Duration must be at least 20 minutes.",
      );
      return;
    }

    const savedService: Service = {
      ...editingService,
      name,
      defaultDurationMinutes:
        Math.round(
          parsedDuration / 20,
        ) * 20,
    };

    const exists =
      currentConfiguration.services.some(
        (service) =>
          service.id ===
          savedService.id,
      );

    const services = exists
      ? currentConfiguration.services.map(
          (service) =>
            service.id ===
            savedService.id
              ? savedService
              : service,
        )
      : [
          ...currentConfiguration.services,
          savedService,
        ];

    const success =
      await saveServices(
        services,
      );

    if (success) {
      closeServiceEditor();
    }
  }

  async function deleteService(
    id: string,
  ) {
    const used =
      currentConfiguration.providers.some(
        (provider) =>
          provider.serviceIds.includes(
            id,
          ),
      );

    if (used) {
      setError(
        "Remove this service from its providers before deleting it.",
      );
      return;
    }

    await saveServices(
      currentConfiguration.services.filter(
        (service) =>
          service.id !== id,
      ),
    );

    if (
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
      serviceIds: [
        ...provider.serviceIds,
      ],
    });
  }

  function addProvider() {
    const maxOrder =
      currentConfiguration.providers.reduce(
        (max, provider) =>
          Math.max(
            max,
            provider.displayOrder,
          ),
        -1,
      );

    const id = `provider-${crypto.randomUUID()}`;

    setEditingProvider({
      id,
      name: "",
      serviceIds: [],
      active: true,
      displayOrder:
        maxOrder + 1,
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

    const name =
      editingProvider.name.trim();

    if (!name) {
      setError(
        "Please enter the provider name.",
      );
      return;
    }

    const savedProvider: Provider = {
      ...editingProvider,
      name,
    };

    const exists =
      currentConfiguration.providers.some(
        (provider) =>
          provider.id ===
          savedProvider.id,
      );

    const providers = exists
      ? currentConfiguration.providers.map(
          (provider) =>
            provider.id ===
            savedProvider.id
              ? savedProvider
              : provider,
        )
      : [
          ...currentConfiguration.providers,
          savedProvider,
        ];

    const success =
      await saveProviders(
        providers,
      );

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
            (id) =>
              id !== serviceId,
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
    setExpandedProviders(
      (current) => {
        const next = new Set(
          current,
        );

        if (next.has(providerId)) {
          next.delete(providerId);
        } else {
          next.add(providerId);
        }

        return next;
      },
    );
  }

  async function moveProvider(
    providerId: string,
    direction: -1 | 1,
  ) {
    const providers =
      sortProviders(
        currentConfiguration.providers,
      );

    const index =
      providers.findIndex(
        (provider) =>
          provider.id === providerId,
      );

    const targetIndex =
      index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >=
        providers.length
    ) {
      return;
    }

    const reordered = [
      ...providers,
    ];

    [
      reordered[index],
      reordered[targetIndex],
    ] = [
      reordered[targetIndex],
      reordered[index],
    ];

    const normalized =
      reordered.map(
        (
          provider,
          position,
        ) => ({
          ...provider,
          displayOrder:
            position,
        }),
      );

    await saveProviders(
      normalized,
    );
  }

  function beginAddAvailability(
    providerId: string,
  ) {
    const existing =
      availabilityRowsFor(
        providerId,
      )[0];

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
      setError(
        "Please choose a date.",
      );
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
            id: `availability-${crypto.randomUUID()}`,
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
                item.id !==
                saved.id,
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
          item.id ===
          row.availabilityId,
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

    const updated: ProviderAvailability =
      {
        ...availability,
        blocks:
          availability.blocks
            .map(
              (
                block,
                index,
              ) =>
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
              item.id ===
              saved.id
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
          item.id ===
          row.availabilityId,
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
        const updated: ProviderAvailability =
          {
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
            and the hours they are
            available to serve.
          </p>
        </div>

        <span className="admin-badge">
          Admin only
        </span>
      </div>

      <div className="config-layout">
        <aside className="config-nav">
          <button
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
                  <h2>
                    Services
                  </h2>

                  <p>
                    These are the
                    services staff can
                    schedule. Duration
                    is the default
                    appointment length.
                  </p>
                </div>

                <button
                  className="primary-button"
                  onClick={
                    addService
                  }
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
                          {
                            service.name
                          }
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
                          className="secondary-button"
                          onClick={() =>
                            openServiceEditor(
                              service,
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="danger-button"
                          onClick={() =>
                            void deleteService(
                              service.id,
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ),
                )}

                {!currentConfiguration
                  .services
                  .length && (
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

                    return (
                      <div
                        className={`provider-admin-card ${
                          expanded
                            ? "expanded"
                            : ""
                        }`}
                        key={provider.id}
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
                                {provider
                                  .serviceIds
                                  .length ===
                                1
                                  ? "service"
                                  : "services"}
                              </small>
                            </span>
                          </button>

                          <div className="provider-card-actions">
                            <button
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
                              className="icon-order-button"
                              disabled={
                                index ===
                                  currentConfiguration
                                    .providers
                                    .length -
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
                              {provider
                                .serviceIds
                                .length
                                ? provider.serviceIds.map(
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
                                : (
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
                              {availability.length ===
                              1
                                ? "block"
                                : "blocks"}
                            </span>
                          </div>
                        )}

                        {expanded && (
                          <div className="provider-expanded-content">
                            <div className="provider-service-chips">
                              {provider
                                .serviceIds
                                .length
                                ? provider.serviceIds.map(
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
                                : (
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
                                    No availability
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
                                    className="secondary-button"
                                    onClick={
                                      cancelAddAvailability
                                    }
                                  >
                                    Cancel
                                  </button>

                                  <button
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
                              Example: Aug
                              21,
                              8:00
                              AM–12:00
                              PM and
                              Aug 21,
                              1:00
                              PM–5:00
                              PM can be
                              entered as
                              two
                              separate
                              blocks.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  },
                )}

                {!currentConfiguration
                  .providers
                  .length && (
                  <div className="availability-empty">
                    No providers
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
            onClick={(event) =>
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
                onClick={
                  closeServiceEditor
                }
              >
                x
              </button>
            </div>

            <label>
              Name

              <input
                autoFocus
                value={
                  editingService.name
                }
                onChange={(event) =>
                  setEditingService(
                    {
                      ...editingService,
                      name:
                        event.target
                          .value,
                    },
                  )
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
                    event.target
                      .value,
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
            onClick={(event) =>
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
                  setEditingProvider(
                    {
                      ...editingProvider,
                      name:
                        event.target
                          .value,
                    },
                  )
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

                      {
                        service.name
                      }
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
    </div>
  );
}