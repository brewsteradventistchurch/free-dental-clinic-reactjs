import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createPatient,
  searchPatients,
  updatePatient,
  type PatientRequest,
} from "../api/patients";
import { getConfiguration } from "../api/configurationApi";
import type {
  ClinicConfiguration,
  Patient,
} from "../schedule/types";
import "./RegistrationPage.css";

type PatientForm = {
  id: string;

  firstName: string;
  lastName: string;
  dateOfBirth: string;

  email: string;
  cellPhone: string;
  alternatePhone: string;

  preferredLanguage: string;
  needsTranslator: boolean;

  streetAddress: string;
  streetCity: string;
  streetState: string;
  streetZip: string;

  mailingAddress: string;
  mailingCity: string;
  mailingState: string;
  mailingZip: string;

  spouseOrParentName: string;
  referral: string;

  bookingStatus: string;
  sourceOfRequest: string;
  requestDate: string;

  serviceRequested: string;

  followUpInterests: string[];

  newNote: string;
};

function nowForDateTimeInput() {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function emptyForm(
  configuration?: ClinicConfiguration | null,
): PatientForm {
  return {
    id: "---",

    firstName: "",
    lastName: "",
    dateOfBirth: "",

    email: "",
    cellPhone: "",
    alternatePhone: "",

    preferredLanguage:
      configuration?.preferredLanguages[0] ?? "English",
    needsTranslator: false,

    streetAddress: "",
    streetCity: "",
    streetState: "WA",
    streetZip: "",

    mailingAddress: "",
    mailingCity: "",
    mailingState: "WA",
    mailingZip: "",

    spouseOrParentName: "",
    referral: "",

    bookingStatus:
      configuration?.bookingStatuses.find(
        (status) => status.active,
      )?.name ?? "",

    sourceOfRequest:
      configuration?.requestSources[0] ?? "",

    requestDate: nowForDateTimeInput(),

    serviceRequested:
      configuration?.services.find((service) => service.active)?.id ?? "",

    followUpInterests: [],

    newNote: "",
  };
}

function patientToForm(patient: Patient): PatientForm {
  return {
    id: patient.id,

    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth ?? "",

    email: patient.email ?? "",
    cellPhone: patient.cellPhone,
    alternatePhone: patient.alternatePhone ?? "",

    preferredLanguage: patient.preferredLanguage,
    needsTranslator: patient.needsTranslator,

    streetAddress: patient.streetAddress ?? "",
    streetCity: patient.streetCity ?? "",
    streetState: patient.streetState ?? "WA",
    streetZip: patient.streetZip ?? "",

    mailingAddress: patient.mailingAddress ?? "",
    mailingCity: patient.mailingCity ?? "",
    mailingState: patient.mailingState ?? "WA",
    mailingZip: patient.mailingZip ?? "",

    spouseOrParentName: patient.spouseOrParentName ?? "",
    referral: patient.referral ?? "",

    bookingStatus: patient.bookingStatus,
    sourceOfRequest: patient.sourceOfRequest,
    requestDate: patient.requestDate,

    serviceRequested: patient.serviceRequested ?? "",

    followUpInterests: [...patient.followUpInterests],

    newNote: "",
  };
}

export default function RegistrationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [configuration, setConfiguration] =
    useState<ClinicConfiguration | null>(null);

  const [configurationLoading, setConfigurationLoading] = useState(true);
  const [configurationError, setConfigurationError] = useState("");

  const [form, setForm] = useState<PatientForm>(() => emptyForm());

  const [currentPatient, setCurrentPatient] =
    useState<Patient | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);

  const [editingExistingPatient, setEditingExistingPatient] =
    useState(false);
  const [pendingNoteLogs, setPendingNoteLogs] = useState<
    NonNullable<Patient["noteLogs"]>
  >([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [notificationKey, setNotificationKey] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(() => new Set());

  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set([0]),
  );

  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadConfiguration() {
      setConfigurationLoading(true);
      setConfigurationError("");

      try {
        const loadedConfiguration = await getConfiguration();

        if (cancelled) {
          return;
        }

        setConfiguration(loadedConfiguration);

        setForm((current) => {
          if (current.id !== "---") {
            return current;
          }

          return emptyForm(loadedConfiguration);
        });
      } catch (configurationLoadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load clinic configuration:",
          configurationLoadError,
        );

        setConfigurationError(
          "Clinic configuration could not be loaded. Please refresh and try again.",
        );
      } finally {
        if (!cancelled) {
          setConfigurationLoading(false);
        }
      }
    }

    void loadConfiguration();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const query = searchTerm.trim();

    if (!query) {
      setSearchResults([]);
      setSearchingPatients(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      setSearchingPatients(true);

      try {
        const patients = await searchPatients(query, controller.signal);

        setSearchResults(patients.slice(0, 8));
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to search patients:", searchError);
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setSearchingPatients(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  function update<K extends keyof PatientForm>(
    field: K,
    value: PatientForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setInvalidFields((current) => {
      if (!current.has(field)) {
        return current;
      }

      const next = new Set(current);
      next.delete(field);
      return next;
    });
  }

  function showError(messageText: string, field?: keyof PatientForm) {
    setError(messageText);
    setMessage("");
    setNotificationKey((current) => current + 1);

    setInvalidFields(() =>
      field ? new Set([field]) : new Set(),
    );
  }

  function toggleInterest(interest: string) {
    setForm((current) => ({
      ...current,
      followUpInterests: current.followUpInterests.includes(interest)
        ? current.followUpInterests.filter((item) => item !== interest)
        : [...current.followUpInterests, interest],
    }));
  }

  function selectPatient(patient: Patient) {
    setCurrentPatient(patient);
    setForm(patientToForm(patient));
    setEditingExistingPatient(true);
    setPendingNoteLogs([...(patient.noteLogs ?? [])]);
    setSearchResultsOpen(false);
    setSearchTerm("");
    setError("");
    setInvalidFields(new Set());
    setMessage(`Loaded patient ${patient.patientNumber}.`);
  }

  function startOver() {
    setCurrentPatient(null);
    setForm(emptyForm(configuration));
    setEditingExistingPatient(false);
    setPendingNoteLogs([]);
    setError("");
    setInvalidFields(new Set());
    setMessage("");
    setSearchTerm("");
    setSearchResultsOpen(false);
  }

  function toggleSection(index: number) {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function handleSectionKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLElement>,
  ) {
    if (event.key !== "Tab" || event.shiftKey || index >= 5) {
      return;
    }

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'input, select, textarea, button:not([disabled])',
      ),
    ).filter((element) => !element.hidden && element.offsetParent !== null);

    const lastFocusable = focusable[focusable.length - 1];
    if (document.activeElement !== lastFocusable) {
      return;
    }

    event.preventDefault();
    const nextIndex = index + 1;

    setOpenSections((current) => {
      const next = new Set(current);
      next.delete(index);
      next.add(nextIndex);
      return next;
    });

    window.setTimeout(() => {
      const sections = document.querySelectorAll<HTMLElement>(
        ".registration-section",
      );
      const nextSection = sections[nextIndex];
      const firstFocusable = nextSection
        ? Array.from(
            nextSection.querySelectorAll<HTMLElement>(
              'input, select, textarea, button:not([disabled])',
            ),
          ).find(
            (element) =>
              !element.hidden &&
              element.offsetParent !== null &&
              !element.classList.contains("registration-section-toggle"),
          )
        : undefined;
      firstFocusable?.focus();
    }, 0);
  }

  function addNote() {
    const note = form.newNote.trim();

    if (!note) {
      showError("Enter a note before adding it.", "newNote");
      return;
    }

    const noteLog: Patient["noteLogs"][number] = {
      id: crypto.randomUUID(),
      note,
      createdAt: new Date().toISOString(),
      volunteerId: user?.id ?? "",
      volunteerName:
        user?.firstName ?? user?.email ?? "Clinic staff",
    };

    setPendingNoteLogs((current) => [...current, noteLog]);
    setForm((current) => ({ ...current, newNote: "" }));
    setError("");
    setMessage(
      editingExistingPatient
        ? "Note added. Save the patient to record it."
        : "Note added to the new patient registration.",
    );
  }

  function validate(): boolean {
    if (!form.firstName.trim()) {
      showError("First name is required.", "firstName");
      return false;
    }

    if (!form.lastName.trim()) {
      showError("Last name is required.", "lastName");
      return false;
    }

    if (!form.bookingStatus) {
      showError("Booking status is required.", "bookingStatus");
      return false;
    }

    if (!form.sourceOfRequest) {
      showError("Source of request is required.", "sourceOfRequest");
      return false;
    }

    if (!form.cellPhone.trim()) {
      showError("Cell phone is required so the patient can be contacted.", "cellPhone");
      return false;
    }

    if (!form.serviceRequested) {
      showError("Please select the service requested.", "serviceRequested");
      return false;
    }

    return true;
  }

  function buildPatientRequest(): PatientRequest {
    return {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      dateOfBirth: form.dateOfBirth || null,

      contact: {
        email: form.email.trim(),
        cellPhone: form.cellPhone.trim(),
        alternatePhone: form.alternatePhone.trim(),
      },

      streetAddress: {
        address: form.streetAddress.trim(),
        city: form.streetCity.trim(),
        state: form.streetState,
        zip: form.streetZip.trim(),
      },

      mailingAddress: {
        address: form.mailingAddress.trim(),
        city: form.mailingCity.trim(),
        state: form.mailingState,
        zip: form.mailingZip.trim(),
      },

      spouseOrParentName: form.spouseOrParentName.trim(),
      preferredLanguage: form.preferredLanguage,
      needsTranslator: form.needsTranslator,

      request: {
        bookingStatus: form.bookingStatus,
        sourceOfRequest: form.sourceOfRequest,
        requestDate: form.requestDate
          ? new Date(form.requestDate).toISOString()
          : null,
        serviceRequested: form.serviceRequested,
        referral: form.referral.trim(),
      },

      followUpInterests: [...form.followUpInterests],
      noteLogs: [...pendingNoteLogs],
    };
  }

  async function savePatient(shouldSchedule: boolean) {
    setError("");
    setMessage("");

    if (!validate()) {
      return;
    }

    try {
      const request = buildPatientRequest();

      const patient = currentPatient
        ? await updatePatient(currentPatient.id, request)
        : await createPatient(request);

      setCurrentPatient(patient);
      setPendingNoteLogs([...(patient.noteLogs ?? [])]);

      setForm({
        ...patientToForm(patient),
        newNote: "",
      });

      setEditingExistingPatient(true);

      if (shouldSchedule) {
        navigate(
          `/schedule?patientId=${encodeURIComponent(patient.id)}`,
        );
        return;
      }

      setMessage(
        currentPatient
          ? `Patient ${patient.patientNumber} updated successfully.`
          : `Patient ${patient.patientNumber} registered successfully.`,
      );
    } catch (saveError) {
      console.error("Failed to save patient:", saveError);

      setError(
        "The patient could not be saved. Please try again.",
      );
    }
  }

  return (
    <div className="registration-page">
      <div className="page-heading registration-heading">
        <div>
          <span className="eyebrow">Community outreach</span>
          <h1>Patient registration</h1>
          <p>
            Register a new patient, update an existing record, or continue
            directly to scheduling.
          </p>
        </div>

        <div className="registration-id">
          <span>Patient number</span>
          <strong>
            {currentPatient?.patientNumber ?? "New patient"}
          </strong>
        </div>
      </div>

      <div className="registration-search">
        <div className="registration-search-label">
          <strong>Find an existing patient</strong>
          <span>
            Search by ID, name, phone, or email.
          </span>
        </div>

        <div className="registration-search-box">
          <input
            type="search"
            placeholder="Search patient ID, name, phone, or email..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setSearchResultsOpen(true);
            }}
            onFocus={() => setSearchResultsOpen(true)}
          />

          {searchResultsOpen && searchTerm.trim() && (
            <div className="registration-search-results">
              {searchingPatients ? (
                <div className="search-no-results">
                  Searching...
                </div>
              ) : searchResults.length ? (
                searchResults.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                  >
                    <span className="search-result-id">
                      {patient.patientNumber}
                    </span>

                    <span className="search-result-main">
                      <strong>
                        {patient.firstName} {patient.lastName}
                      </strong>

                      <small>
                        {patient.cellPhone}
                        {patient.email
                          ? ` • ${patient.email}`
                          : ""}
                      </small>
                    </span>
                  </button>
                ))
              ) : (
                <div className="search-no-results">
                  No patients found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {configurationLoading && (
        <div className="registration-notifications" aria-live="polite">
          <div className="registration-message" role="status">
            Loading clinic configuration...
          </div>
        </div>
      )}

      {configurationError && (
        <div className="registration-notifications" aria-live="polite">
          <div className="registration-error" role="alert">
            {configurationError}
          </div>
        </div>
      )}

      {(message || error) && (
        <div className="registration-notifications" aria-live="polite">
          {error ? (
            <div
              key={`error-${notificationKey}`}
              className="registration-error"
              role="alert"
            >
              {error}
            </div>
          ) : (
            <div
              key={`message-${notificationKey}`}
              className="registration-message"
              role="status"
            >
              {message}
            </div>
          )}
        </div>
      )}

      <form
        className="registration-card"
        onSubmit={(event) => event.preventDefault()}
      >
        <section
          className={`registration-section ${openSections.has(0) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(0, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(0)}
              aria-expanded={openSections.has(0)}
            >
              <span className="section-number">01</span>
              <h2>Patient information</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>

            {editingExistingPatient && (
              <span className="editing-badge">
                Editing patient {form.id}
              </span>
            )}
          </div>

          <div className="registration-grid">
            <label>
              <span className="label-text">First name <span className="required-marker">*</span></span>
              <input
                className={invalidFields.has("firstName") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("firstName")}
                value={form.firstName}
                onChange={(event) =>
                  update("firstName", event.target.value)
                }
                required
              />
            </label>

            <label>
              <span className="label-text">Last name <span className="required-marker">*</span></span>
              <input
                className={invalidFields.has("lastName") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("lastName")}
                value={form.lastName}
                onChange={(event) =>
                  update("lastName", event.target.value)
                }
                required
              />
            </label>

            <label>
              Date of birth
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(event) =>
                  update("dateOfBirth", event.target.value)
                }
              />
            </label>

            <label>
              Spouse / parent name
              <input
                value={form.spouseOrParentName}
                onChange={(event) =>
                  update(
                    "spouseOrParentName",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section
          className={`registration-section ${openSections.has(1) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(1, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(1)}
              aria-expanded={openSections.has(1)}
            >
              <span className="section-number">02</span>
              <h2>Request & contact</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>

          </div>

          <div className="registration-grid">
            <label>
              <span className="label-text">Booking status <span className="required-marker">*</span></span>
              <select
                className={invalidFields.has("bookingStatus") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("bookingStatus")}
                value={form.bookingStatus}
                onChange={(event) =>
                  update("bookingStatus", event.target.value)
                }
                required
              >
                <option value="" disabled>
                  Select status...
                </option>

                {configuration?.bookingStatuses
                  .filter((status) => status.active)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((status) => (
                    <option value={status.name} key={status.id}>
                      {status.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span className="label-text">Source of request <span className="required-marker">*</span></span>
              <select
                className={invalidFields.has("sourceOfRequest") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("sourceOfRequest")}
                value={form.sourceOfRequest}
                onChange={(event) =>
                  update(
                    "sourceOfRequest",
                    event.target.value,
                  )
                }
                required
              >
                <option value="" disabled>
                  Select source...
                </option>

                {configuration?.requestSources.map((source) => (
                  <option value={source} key={source}>
                    {source}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Request date & time
              <input
                type="datetime-local"
                value={form.requestDate}
                onChange={(event) =>
                  update("requestDate", event.target.value)
                }
              />
              <small className="field-help">
                Defaults to when this registration is started.
              </small>
            </label>

            <label>
              <span className="label-text">Service requested <span className="required-marker">*</span></span>
              <select
                className={invalidFields.has("serviceRequested") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("serviceRequested")}
                value={form.serviceRequested}
                onChange={(event) =>
                  update(
                    "serviceRequested",
                    event.target.value,
                  )
                }
              >
                <option value="">
                  Select service...
                </option>

                {configuration?.services
                  .filter((service) => service.active)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((service) => (
                    <option value={service.id} key={service.id}>
                      {service.name}
                    </option>
                  ))}
              </select>
            </label>

            <label>
              <span className="label-text">Cell phone <span className="required-marker">*</span></span>
              <input
                className={invalidFields.has("cellPhone") ? "field-invalid" : ""}
                aria-invalid={invalidFields.has("cellPhone")}
                type="tel"
                value={form.cellPhone}
                onChange={(event) =>
                  update("cellPhone", event.target.value)
                }
                required
              />
            </label>

            <label>
              Alternate phone
              <input
                type="tel"
                value={form.alternatePhone}
                onChange={(event) =>
                  update(
                    "alternatePhone",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              Email address
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  update("email", event.target.value)
                }
              />
            </label>

            <label>
              Referral
              <input
                value={form.referral}
                onChange={(event) =>
                  update("referral", event.target.value)
                }
              />
            </label>
          </div>
        </section>

        <section
          className={`registration-section ${openSections.has(2) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(2, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(2)}
              aria-expanded={openSections.has(2)}
            >
              <span className="section-number">03</span>
              <h2>Language</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>


          </div>

          <div className="registration-grid language-grid">
            <label>
              Preferred language
              <select
                value={form.preferredLanguage}
                onChange={(event) =>
                  update(
                    "preferredLanguage",
                    event.target.value,
                  )
                }
              >
                {configuration?.preferredLanguages.map((language) => (
                  <option value={language} key={language}>
                    {language}
                  </option>
                ))}
              </select>
            </label>

            <label className="checkbox-field">
              <span className="checkbox-label-spacer" aria-hidden="true">&nbsp;</span>
              <span className="checkbox-control">
                <input
                type="checkbox"
                checked={form.needsTranslator}
                onChange={(event) =>
                  update(
                    "needsTranslator",
                    event.target.checked,
                  )
                }
                />
                <span>
                  <strong>Needs translator</strong>
                  <small>
                    Mark if language assistance will be needed.
                  </small>
                </span>
              </span>
            </label>
          </div>
        </section>

        <section
          className={`registration-section ${openSections.has(3) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(3, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(3)}
              aria-expanded={openSections.has(3)}
            >
              <span className="section-number">04</span>
              <h2>Address</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>


          </div>

          <h3>Street address</h3>

          <div className="registration-grid address-grid">
            <label>
              Street address
              <input
                value={form.streetAddress}
                onChange={(event) =>
                  update(
                    "streetAddress",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              City
              <input
                value={form.streetCity}
                onChange={(event) =>
                  update("streetCity", event.target.value)
                }
              />
            </label>

            <label>
              State
              <select
                value={form.streetState}
                onChange={(event) =>
                  update(
                    "streetState",
                    event.target.value,
                  )
                }
              >
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="ID">Idaho</option>
                <option value="CA">California</option>
              </select>
            </label>

            <label>
              ZIP code
              <input
                value={form.streetZip}
                onChange={(event) =>
                  update("streetZip", event.target.value)
                }
              />
            </label>
          </div>

          <h3 className="address-subheading">
            Mailing address
          </h3>

          <div className="registration-grid address-grid">
            <label>
              Mailing address
              <input
                value={form.mailingAddress}
                onChange={(event) =>
                  update(
                    "mailingAddress",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              City
              <input
                value={form.mailingCity}
                onChange={(event) =>
                  update(
                    "mailingCity",
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              State
              <select
                value={form.mailingState}
                onChange={(event) =>
                  update(
                    "mailingState",
                    event.target.value,
                  )
                }
              >
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="ID">Idaho</option>
                <option value="CA">California</option>
              </select>
            </label>

            <label>
              ZIP code
              <input
                value={form.mailingZip}
                onChange={(event) =>
                  update(
                    "mailingZip",
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section
          className={`registration-section ${openSections.has(4) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(4, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(4)}
              aria-expanded={openSections.has(4)}
            >
              <span className="section-number">05</span>
              <h2>Community follow-up</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>


          </div>

          <p className="section-description">
            Select any community outreach opportunities the
            patient is interested in. Leave blank if there are
            none.
          </p>

          <div className="interest-grid">
            {configuration?.communityFollowUps.map(
              (interest) => (
                <label
                  className={`interest-option ${
                    form.followUpInterests.includes(interest)
                      ? "selected"
                      : ""
                  }`}
                  key={interest}
                >
                  <input
                    type="checkbox"
                    checked={form.followUpInterests.includes(
                      interest,
                    )}
                    onChange={() =>
                      toggleInterest(interest)
                    }
                  />

                  <span>{interest}</span>
                </label>
              ),
            )}
          </div>
        </section>

        <section
          className={`registration-section ${openSections.has(5) ? "open" : ""}`}
          onKeyDown={(event) => handleSectionKeyDown(5, event)}
        >
          <div className="registration-section-heading">
            <button
              type="button"
              className="registration-section-toggle"
              onClick={() => toggleSection(5)}
              aria-expanded={openSections.has(5)}
            >
              <span className="section-number">06</span>
              <h2>Notes</h2>
              <span className="section-chevron" aria-hidden="true">⌄</span>
            </button>


          </div>

          <div className="note-input">
            <label htmlFor="patient-note">Add note</label>
            <textarea
              id="patient-note"
              rows={3}
              placeholder="Add a note about this patient or request..."
              value={form.newNote}
              onChange={(event) =>
                update("newNote", event.target.value)
              }
            />
            <div className="note-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={addNote}
              >
                Add note
              </button>
            </div>
          </div>

          {(() => {
            const logs = pendingNoteLogs;

            if (!logs.length) {
              return (
                <div className="empty-note-log">
                  No note logs yet.
                </div>
              );
            }

            return (
              <div className="note-log">
                <div className="note-log-heading">
                  <strong>Note logs</strong>
                  <span>
                    Previous entries are read-only.
                  </span>
                </div>

                {logs
                  .slice()
                  .reverse()
                  .map((log) => (
                    <div className="note-log-entry" key={log.id}>
                      <div className="note-log-meta">
                        <strong>{log.volunteerName}</strong>
                        <span>
                          {new Date(
                            log.createdAt,
                          ).toLocaleString()}
                        </span>
                      </div>

                      <p>{log.note}</p>
                    </div>
                  ))}
              </div>
            );
          })()}
        </section>

        <div className="registration-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={startOver}
          >
            Start over
          </button>

          <div className="registration-primary-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => savePatient(false)}
              disabled={configurationLoading || !configuration}
            >
              Save patient
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => savePatient(true)}
              disabled={configurationLoading || !configuration}
            >
              Save & schedule
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}