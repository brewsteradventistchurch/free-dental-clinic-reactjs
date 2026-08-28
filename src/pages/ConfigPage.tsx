import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getScheduleStore,
  resetScheduleStore,
  saveScheduleStore,
} from "../schedule/scheduleStore";
import type { Provider, ProviderAvailability, ServiceType } from "../schedule/types";
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
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function fromTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function todayString() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function ConfigPage() {
  const { user } = useAuth();
  const [store, setStore] = useState(getScheduleStore);
  const [section, setSection] = useState<"services" | "providers">("services");
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [serviceDurationDraft, setServiceDurationDraft] = useState("");
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [addingAvailabilityFor, setAddingAvailabilityFor] = useState<string | null>(null);
  const [availabilityDraft, setAvailabilityDraft] = useState({
    date: todayString(),
    startMinutes: 8 * 60,
    endMinutes: 12 * 60,
  });

  if (user?.role.toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  function commit(next: typeof store, successMessage = "Changes saved") {
    setStore(next);
    saveScheduleStore(next);
    setMessage(successMessage);
    window.setTimeout(() => setMessage(""), 2200);
  }

  function openServiceEditor(service: ServiceType) {
    setEditingService({ ...service });
    setServiceDurationDraft(String(service.defaultDurationMinutes));
  }

  function addService() {
    const id = `service-${Date.now()}`;
    setEditingService({ id, name: "New service", defaultDurationMinutes: 60 });
    setServiceDurationDraft("60");
    setSection("services");
  }

  function closeServiceEditor() {
    setEditingService(null);
    setServiceDurationDraft("");
  }

  function normalizeDurationOnBlur() {
    const parsed = Number.parseInt(serviceDurationDraft, 10);
    if (!Number.isFinite(parsed) || parsed < 20) {
      setServiceDurationDraft("20");
      return;
    }
    setServiceDurationDraft(String(Math.round(parsed / 20) * 20));
  }

  function saveServiceEdit() {
    if (!editingService) return;

    const name = editingService.name.trim();
    if (!name) {
      setMessage("Please enter a service name.");
      return;
    }

    const parsedDuration = Number.parseInt(serviceDurationDraft, 10);
    if (!Number.isFinite(parsedDuration) || parsedDuration < 20) {
      setMessage("Duration must be at least 20 minutes.");
      return;
    }

    const savedService = {
      ...editingService,
      name,
      defaultDurationMinutes: Math.round(parsedDuration / 20) * 20,
    };

    const exists = store.services.some((service) => service.id === savedService.id);
    const next = {
      ...store,
      services: exists
        ? store.services.map((service) => service.id === savedService.id ? savedService : service)
        : [...store.services, savedService],
    };

    commit(next);
    closeServiceEditor();
  }

  function deleteService(id: string) {
    const used = store.providers.some((provider) => provider.serviceIds.includes(id));
    if (used) {
      setMessage("Remove this service from its providers before deleting it.");
      return;
    }
    commit({ ...store, services: store.services.filter((service) => service.id !== id) });
    if (editingService?.id === id) closeServiceEditor();
  }

  function openProviderEditor(provider: Provider) {
    setEditingProvider({ ...provider, serviceIds: [...provider.serviceIds] });
  }

  function addProvider() {
    const id = `provider-${Date.now()}`;
    setEditingProvider({ id, name: "New provider", title: "Provider", serviceIds: [] });
    setSection("providers");
    setExpandedProviders((current) => new Set(current).add(id));
  }

  function closeProviderEditor() {
    setEditingProvider(null);
  }

  function saveProviderEdit() {
    if (!editingProvider) return;

    const name = editingProvider.name.trim();
    const title = editingProvider.title.trim();
    if (!name || !title) {
      setMessage("Please enter the provider name and role/title.");
      return;
    }

    const savedProvider = { ...editingProvider, name, title };
    const exists = store.providers.some((provider) => provider.id === savedProvider.id);
    const next = {
      ...store,
      providers: exists
        ? store.providers.map((provider) => provider.id === savedProvider.id ? savedProvider : provider)
        : [...store.providers, savedProvider],
    };

    commit(next);
    closeProviderEditor();
  }

  function toggleDraftProviderService(serviceId: string) {
    if (!editingProvider) return;
    const serviceIds = editingProvider.serviceIds.includes(serviceId)
      ? editingProvider.serviceIds.filter((id) => id !== serviceId)
      : [...editingProvider.serviceIds, serviceId];
    setEditingProvider({ ...editingProvider, serviceIds });
  }

  function toggleProviderExpanded(providerId: string) {
    setExpandedProviders((current) => {
      const next = new Set(current);
      if (next.has(providerId)) next.delete(providerId);
      else next.add(providerId);
      return next;
    });
  }

  function moveProvider(providerId: string, direction: -1 | 1) {
    const index = store.providers.findIndex((provider) => provider.id === providerId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= store.providers.length) return;

    const providers = [...store.providers];
    [providers[index], providers[targetIndex]] = [providers[targetIndex], providers[index]];
    commit({ ...store, providers });
  }

  function availabilityFor(providerId: string) {
    return store.providerAvailability
      .filter((item) => item.providerId === providerId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
  }

  function beginAddAvailability(providerId: string) {
    const firstExisting = availabilityFor(providerId)[0];
    setAvailabilityDraft({
      date: firstExisting?.date ?? todayString(),
      startMinutes: 8 * 60,
      endMinutes: 12 * 60,
    });
    setAddingAvailabilityFor(providerId);
    setExpandedProviders((current) => new Set(current).add(providerId));
  }

  function cancelAddAvailability() {
    setAddingAvailabilityFor(null);
  }

  function addAvailability(providerId: string) {
    if (!availabilityDraft.date) {
      setMessage("Please choose a date.");
      return;
    }
    if (availabilityDraft.endMinutes <= availabilityDraft.startMinutes) {
      setMessage("The end time must be after the start time.");
      return;
    }

    const overlaps = store.providerAvailability.some((item) =>
      item.providerId === providerId &&
      item.date === availabilityDraft.date &&
      availabilityDraft.startMinutes < item.endMinutes &&
      availabilityDraft.endMinutes > item.startMinutes,
    );

    if (overlaps) {
      setMessage("That time overlaps an existing availability block.");
      return;
    }

    const entry: ProviderAvailability = {
      id: `availability-${Date.now()}`,
      providerId,
      date: availabilityDraft.date,
      startMinutes: availabilityDraft.startMinutes,
      endMinutes: availabilityDraft.endMinutes,
    };

    commit({ ...store, providerAvailability: [...store.providerAvailability, entry] });
    setAddingAvailabilityFor(null);
  }

  function updateAvailability(item: ProviderAvailability, patch: Partial<ProviderAvailability>) {
    const updated = { ...item, ...patch };
    if (updated.endMinutes <= updated.startMinutes) {
      setMessage("The end time must be after the start time.");
      return;
    }

    const overlaps = store.providerAvailability.some((entry) =>
      entry.id !== item.id &&
      entry.providerId === updated.providerId &&
      entry.date === updated.date &&
      updated.startMinutes < entry.endMinutes &&
      updated.endMinutes > entry.startMinutes,
    );

    if (overlaps) {
      setMessage("That time overlaps an existing availability block.");
      return;
    }

    commit({
      ...store,
      providerAvailability: store.providerAvailability.map((entry) => entry.id === item.id ? updated : entry),
    });
  }

  function removeAvailability(item: ProviderAvailability) {
    commit({
      ...store,
      providerAvailability: store.providerAvailability.filter((entry) => entry.id !== item.id),
    });
  }

  function handleReset() {
    resetScheduleStore();
    setStore(getScheduleStore());
    closeServiceEditor();
    closeProviderEditor();
    setAddingAvailabilityFor(null);
    setExpandedProviders(new Set());
    setMessage("Demo configuration restored.");
  }

  return (
    <div className="config-page">
      <div className="page-heading page-heading-row">
        <div>
          <span className="eyebrow">Configuration</span>
          <h1>Clinic setup</h1>
          <p>Manage services, providers, and the hours they are available to serve.</p>
        </div>
        <span className="admin-badge">Admin only</span>
      </div>

      <div className="config-layout">
        <aside className="config-nav">
          <button className={section === "services" ? "active" : ""} onClick={() => setSection("services")}>
            <strong>Services</strong><span>Names and default durations</span>
          </button>
          <button className={section === "providers" ? "active" : ""} onClick={() => setSection("providers")}>
            <strong>Providers</strong><span>People, roles, and availability</span>
          </button>
        </aside>

        <section className="admin-panel">
          {message && <div className="admin-message" role="status">{message}</div>}

          {section === "services" && (
            <>
              <div className="admin-panel-header">
                <div><h2>Services</h2><p>These are the services staff can schedule. Duration is the default appointment length.</p></div>
                <button className="primary-button" onClick={addService}>+ Add service</button>
              </div>

              <div className="admin-list">
                {store.services.map((service) => (
                  <div className="admin-list-row" key={service.id}>
                    <div>
                      <strong>{service.name}</strong>
                      <span>{service.defaultDurationMinutes} minute default</span>
                    </div>
                    <div className="admin-row-actions">
                      <button className="secondary-button" onClick={() => openServiceEditor(service)}>Edit</button>
                      <button className="danger-button" onClick={() => deleteService(service.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {section === "providers" && (
            <>
              <div className="admin-panel-header">
                <div><h2>Providers</h2><p>Keep providers collapsed for a clean overview. Expand one to manage services and add as many availability blocks as needed.</p></div>
                <button className="primary-button" onClick={addProvider}>+ Add provider</button>
              </div>

              <div className="admin-list">
                {store.providers.map((provider, index) => {
                  const expanded = expandedProviders.has(provider.id);
                  const availability = availabilityFor(provider.id);
                  return (
                    <div className={`provider-admin-card ${expanded ? "expanded" : ""}`} key={provider.id}>
                      <div className="provider-admin-heading">
                        <button type="button" className="provider-expand-button" onClick={() => toggleProviderExpanded(provider.id)} aria-expanded={expanded}>
                          <span className="provider-chevron">{expanded ? "⌄" : "›"}</span>
                          <span><strong>{provider.name}</strong><small>{provider.title}</small></span>
                        </button>

                        <div className="provider-card-actions">
                          <button className="icon-order-button" disabled={index === 0} onClick={() => moveProvider(provider.id, -1)} aria-label={`Move ${provider.name} up`}>↑</button>
                          <button className="icon-order-button" disabled={index === store.providers.length - 1} onClick={() => moveProvider(provider.id, 1)} aria-label={`Move ${provider.name} down`}>↓</button>
                          <button className="secondary-button" onClick={() => openProviderEditor(provider)}>Edit</button>
                        </div>
                      </div>

                      {!expanded && (
                        <div className="provider-collapsed-summary">
                          <div className="provider-service-chips compact">
                            {provider.serviceIds.length ? provider.serviceIds.map((id) => <span key={id}>{store.services.find((service) => service.id === id)?.name ?? id}</span>) : <em>No services assigned</em>}
                          </div>
                          <span className="availability-summary">{availability.length} availability {availability.length === 1 ? "block" : "blocks"}</span>
                        </div>
                      )}

                      {expanded && (
                        <div className="provider-expanded-content">
                          <div className="provider-service-chips">
                            {provider.serviceIds.length ? provider.serviceIds.map((id) => <span key={id}>{store.services.find((service) => service.id === id)?.name ?? id}</span>) : <em>No services assigned</em>}
                          </div>

                          <div className="availability-header">
                            <div>
                              <strong>Availability</strong>
                              <span>Add separate blocks for breaks, lunch, or split shifts.</span>
                            </div>
                            <button className="secondary-button" onClick={() => beginAddAvailability(provider.id)}>+ Add time</button>
                          </div>

                          <div className="availability-grid">
                            {availability.map((item) => (
                              <div className="availability-row available" key={item.id}>
                                <div className="availability-date">
                                  <strong>{formatShortDate(item.date)}</strong>
                                  <span>{formatDate(item.date)}</span>
                                </div>
                                <div className="availability-times">
                                  <input type="time" value={toTime(item.startMinutes)} onChange={(e) => updateAvailability(item, { startMinutes: fromTime(e.target.value) })} />
                                  <span>to</span>
                                  <input type="time" value={toTime(item.endMinutes)} onChange={(e) => updateAvailability(item, { endMinutes: fromTime(e.target.value) })} />
                                  <button className="danger-button" onClick={() => removeAvailability(item)}>Remove</button>
                                </div>
                              </div>
                            ))}

                            {!availability.length && addingAvailabilityFor !== provider.id && (
                              <div className="availability-empty">No availability configured yet. Add the first time block.</div>
                            )}
                          </div>

                          {addingAvailabilityFor === provider.id && (
                            <div className="availability-add-editor">
                              <div>
                                <strong>Add availability</strong>
                                <span>Choose a date and one continuous working period.</span>
                              </div>
                              <label>Date<input type="date" value={availabilityDraft.date} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, date: e.target.value })} /></label>
                              <label>Start<input type="time" value={toTime(availabilityDraft.startMinutes)} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, startMinutes: fromTime(e.target.value) })} /></label>
                              <label>End<input type="time" value={toTime(availabilityDraft.endMinutes)} onChange={(e) => setAvailabilityDraft({ ...availabilityDraft, endMinutes: fromTime(e.target.value) })} /></label>
                              <div className="availability-add-actions">
                                <button className="secondary-button" onClick={cancelAddAvailability}>Cancel</button>
                                <button className="primary-button" onClick={() => addAvailability(provider.id)}>Add time</button>
                              </div>
                            </div>
                          )}

                          <p className="availability-note">Example: Aug 21, 8:00 AM–12:00 PM and Aug 21, 1:00 PM–5:00 PM can be entered as two separate blocks.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="admin-reset"><button className="text-button" onClick={handleReset}>Reset demo configuration</button></div>
        </section>
      </div>

      {editingService && (
        <div className="config-modal-backdrop" role="presentation">
          <div className="config-modal" role="dialog" aria-modal="true" aria-labelledby="edit-service-title" onClick={(event) => event.stopPropagation()}>
            <div className="config-modal-header">
              <div><span className="config-modal-eyebrow">Service</span><h3 id="edit-service-title">Edit service</h3></div>
              <button type="button" className="config-modal-close" aria-label="Close" onClick={closeServiceEditor}>×</button>
            </div>

            <label>Name<input autoFocus value={editingService.name} onChange={(e) => setEditingService({ ...editingService, name: e.target.value })} /></label>
            <label>Default duration (minutes)<input type="number" min="20" step="20" inputMode="numeric" value={serviceDurationDraft} onChange={(e) => setServiceDurationDraft(e.target.value)} onBlur={normalizeDurationOnBlur} /><span className="field-help">Durations are adjusted in 20-minute increments.</span></label>

            <div className="config-modal-actions">
              <button type="button" className="secondary-button" onClick={closeServiceEditor}>Cancel</button>
              <button type="button" className="primary-button" onClick={saveServiceEdit}>Done</button>
            </div>
          </div>
        </div>
      )}

      {editingProvider && (
        <div className="config-modal-backdrop" role="presentation">
          <div className="config-modal config-provider-modal" role="dialog" aria-modal="true" aria-labelledby="edit-provider-title" onClick={(event) => event.stopPropagation()}>
            <div className="config-modal-header">
              <div><span className="config-modal-eyebrow">Provider</span><h3 id="edit-provider-title">Edit provider</h3></div>
              <button type="button" className="config-modal-close" aria-label="Close" onClick={closeProviderEditor}>×</button>
            </div>

            <label>Name<input autoFocus value={editingProvider.name} onChange={(e) => setEditingProvider({ ...editingProvider, name: e.target.value })} /></label>
            <label>Role / title<input value={editingProvider.title} onChange={(e) => setEditingProvider({ ...editingProvider, title: e.target.value })} /></label>
            <div><span className="editor-label">Services this provider can perform</span><div className="service-checkboxes">
              {store.services.map((service) => <label key={service.id}><input type="checkbox" checked={editingProvider.serviceIds.includes(service.id)} onChange={() => toggleDraftProviderService(service.id)} />{service.name}</label>)}
            </div></div>

            <div className="config-modal-actions">
              <button type="button" className="secondary-button" onClick={closeProviderEditor}>Cancel</button>
              <button type="button" className="primary-button" onClick={saveProviderEdit}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
