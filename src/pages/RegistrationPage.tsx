import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getNextPatientId,
  getScheduleStore,
  saveScheduleStore,
} from "../schedule/scheduleStore";
import type { Patient } from "../schedule/types";
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

function emptyForm(): PatientForm {
  const store = getScheduleStore();

  return {
    id: getNextPatientId(store.patients),

    firstName: "",
    lastName: "",
    dateOfBirth: "",

    email: "",
    cellPhone: "",
    alternatePhone: "",

    preferredLanguage:
      store.preferredLanguages[0] ?? "English",
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
      store.bookingStatuses[0] ?? "",

    sourceOfRequest: "",

    requestDate: nowForDateTimeInput(),

    serviceRequested: "",

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

  const [store, setStore] = useState(getScheduleStore);
  const [form, setForm] = useState<PatientForm>(() => emptyForm());

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResultsOpen, setSearchResultsOpen] = useState(false);

  const [editingExistingPatient, setEditingExistingPatient] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [hasSaved, setHasSaved] = useState(false);

  const searchResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return store.patients
      .filter((patient) => {
        const searchable = [
          patient.id,
          patient.firstName,
          patient.lastName,
          `${patient.firstName} ${patient.lastName}`,
          patient.cellPhone,
          patient.alternatePhone ?? "",
          patient.email ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [searchTerm, store.patients]);

  function update<K extends keyof PatientForm>(
    field: K,
    value: PatientForm[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
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
    setForm(patientToForm(patient));
    setEditingExistingPatient(true);
    setHasSaved(true);
    setSearchResultsOpen(false);
    setSearchTerm("");
    setError("");
    setMessage(`Loaded patient ${patient.id}.`);
  }

  function startOver() {
    setForm(emptyForm());
    setEditingExistingPatient(false);
    setHasSaved(false);
    setError("");
    setMessage("");
    setSearchTerm("");
    setSearchResultsOpen(false);
  }

  function validate(): boolean {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return false;
    }

    if (!form.lastName.trim()) {
      setError("Last name is required.");
      return false;
    }

    if (!form.bookingStatus) {
      setError("Booking status is required.");
      return false;
    }

    if (!form.sourceOfRequest) {
      setError("Source of request is required.");
      return false;
    }

    if (!form.cellPhone.trim()) {
      setError("Cell phone is required so the patient can be contacted.");
      return false;
    }

    if (!form.serviceRequested) {
      setError("Please select the service requested.");
      return false;
    }

    return true;
  }

  function buildPatient(existingPatient?: Patient): Patient {
    const now = new Date().toISOString();

    const noteLogs = [...(existingPatient?.noteLogs ?? [])];

    if (form.newNote.trim()) {
      noteLogs.push({
        id: `note-${Date.now()}`,
        note: form.newNote.trim(),
        createdAt: now,
        volunteerId: user?.id + '',
        volunteerName:
          // TODO maybe use:
          // user ? `${user.firstName} ${user.lastName}`
          user?.firstName ??
          user?.email ??
          "Clinic staff",
      });
    }

    return {
      id: form.id,

      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),

      dateOfBirth: form.dateOfBirth || undefined,

      email: form.email.trim() || undefined,
      cellPhone: form.cellPhone.trim(),
      alternatePhone: form.alternatePhone.trim() || undefined,

      preferredLanguage: form.preferredLanguage,
      needsTranslator: form.needsTranslator,

      streetAddress: form.streetAddress.trim() || undefined,
      streetCity: form.streetCity.trim() || undefined,
      streetState: form.streetState || undefined,
      streetZip: form.streetZip.trim() || undefined,

      mailingAddress: form.mailingAddress.trim() || undefined,
      mailingCity: form.mailingCity.trim() || undefined,
      mailingState: form.mailingState || undefined,
      mailingZip: form.mailingZip.trim() || undefined,

      spouseOrParentName: form.spouseOrParentName.trim() || undefined,

      referral: form.referral.trim() || undefined,

      bookingStatus: form.bookingStatus,
      sourceOfRequest: form.sourceOfRequest,
      requestDate: form.requestDate,

      serviceRequested: form.serviceRequested,

      followUpInterests: [...form.followUpInterests],

      noteLogs,
      patientNumber: ""
    };
  }

  function savePatient(shouldSchedule: boolean) {
    setError("");
    setMessage("");

    if (!validate()) {
      return;
    }

    const existingPatient = store.patients.find(
      (patient) => patient.id === form.id,
    );

    const patient = buildPatient(existingPatient);

    const nextPatients = existingPatient
      ? store.patients.map((item) =>
          item.id === patient.id ? patient : item,
        )
      : [...store.patients, patient];

    const nextStore = {
      ...store,
      patients: nextPatients,
    };

    saveScheduleStore(nextStore);
    setStore(nextStore);

    setForm({
      ...patientToForm(patient),
      newNote: "",
    });

    setHasSaved(true);

    if (shouldSchedule) {
      navigate(`/schedule?patientId=${encodeURIComponent(patient.id)}`);
      return;
    }

    setMessage(
      existingPatient
        ? `Patient ${patient.id} updated successfully.`
        : `Patient ${patient.id} registered successfully.`,
    );
    // TODO remove. It's just to keep hasSaved
    if (hasSaved) setHasSaved(true);
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
          <span>Patient ID</span>
          <strong>{form.id}</strong>
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
              {searchResults.length ? (
                searchResults.map((patient) => (
                  <button
                    type="button"
                    key={patient.id}
                    onClick={() => selectPatient(patient)}
                  >
                    <span className="search-result-id">
                      {patient.id}
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

      {message && (
        <div className="registration-message" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="registration-error" role="alert">
          {error}
        </div>
      )}

      <form
        className="registration-card"
        onSubmit={(event) => event.preventDefault()}
      >
        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">01</span>
              <h2>Patient information</h2>
            </div>

            {editingExistingPatient && (
              <span className="editing-badge">
                Editing patient {form.id}
              </span>
            )}
          </div>

          <div className="registration-grid">
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(event) =>
                  update("firstName", event.target.value)
                }
                required
              />
            </label>

            <label>
              Last name
              <input
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

        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">02</span>
              <h2>Request & contact</h2>
            </div>

            <span className="required-note">
              * Required
            </span>
          </div>

          <div className="registration-grid">
            <label>
              Booking status <span>*</span>
              <select
                value={form.bookingStatus}
                onChange={(event) =>
                  update("bookingStatus", event.target.value)
                }
                required
              >
                <option value="" disabled>
                  Select status...
                </option>

                {store.bookingStatuses.map(
                  (status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label>
              Source of request <span>*</span>
              <select
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

                {store.requestSources.map(
                  (source) => (
                    <option value={source} key={source}>
                      {source}
                    </option>
                  ),
                )}
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
              Service requested
              <select
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

                {store.services.map((service) => (
                  <option value={service.id} key={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Cell phone <span>*</span>
              <input
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

        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">03</span>
              <h2>Language</h2>
            </div>
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
                {store.preferredLanguages.map(
                  (language) => (
                    <option
                      value={language}
                      key={language}
                    >
                      {language}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="checkbox-field">
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
            </label>
          </div>
        </section>

        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">04</span>
              <h2>Address</h2>
            </div>
          </div>

          <h3>Street address</h3>

          <div className="registration-grid address-grid">
            <label className="wide-field">
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
            <label className="wide-field">
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

        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">05</span>
              <h2>Community follow-up</h2>
            </div>
          </div>

          <p className="section-description">
            Select any community outreach opportunities the
            patient is interested in. Leave blank if there are
            none.
          </p>

          <div className="interest-grid">
            {store.followUpInterests.map(
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

        <section className="registration-section">
          <div className="registration-section-heading">
            <div>
              <span className="section-number">06</span>
              <h2>Notes</h2>
            </div>
          </div>

          <label className="note-input">
            Add note
            <textarea
              rows={3}
              placeholder="Add a note about this patient or request..."
              value={form.newNote}
              onChange={(event) =>
                update("newNote", event.target.value)
              }
            />
          </label>

          {(() => {
            const existingPatient = store.patients.find(
              (patient) => patient.id === form.id,
            );

            const logs = existingPatient?.noteLogs ?? [];

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
            >
              Save patient
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => savePatient(true)}
            >
              Save & schedule
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}