import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchPatients } from "../api/patients";
import type { Patient } from "../schedule/types";

type ListPatient = Patient & {
  name: string;
};

export default function ListsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [patients, setPatients] = useState<ListPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const controller = new AbortController();

    async function loadPatients() {
      setLoading(true);
      setError("");

      try {
        const loadedPatients = await searchPatients("", controller.signal);

        if (controller.signal.aborted) return;

        setPatients(
          loadedPatients.map((patient) => ({
            ...patient,
            name: `${patient.firstName} ${patient.lastName}`,
          })),
        );
      } catch (loadError) {
        if (controller.signal.aborted) return;

        console.error("Failed to load patients:", loadError);
        setError("Patients could not be loaded. Please refresh and try again.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPatients();

    return () => {
      controller.abort();
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return patients.filter((patient) => {
      const matchesSearch =
        !normalizedSearch ||
        `${patient.name} ${patient.patientNumber} ${patient.id}`
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" ||
        patient.bookingStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [patients, search, statusFilter]);

  function schedulePatient(patientId: string) {
    navigate(`/schedule?patientId=${encodeURIComponent(patientId)}`);
  }

  return (
    <div>
      <div className="page-heading page-heading-row">
        <div>
          <span className="eyebrow">Patient records</span>
          <h1>Patients</h1>
          <p>View patients registered for this clinic.</p>
        </div>

        <span className="record-count">
          {filteredPatients.length} shown
        </span>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span>⌕</span>
          <input
            placeholder="Search by name or patient ID..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter patients by status"
        >
          <option value="all">All statuses</option>

          {Array.from(
            new Set(
              patients
                .map((patient) => patient.bookingStatus)
                .filter((status) => status.trim()),
            ),
          ).map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="error-message" role="alert">
          {error}
        </div>
      )}

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Patient ID</th>
              <th>Date of birth</th>
              <th>Status</th>
              <th>Provider</th>
              <th aria-label="Actions" />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>Loading patients...</td>
              </tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  {search.trim()
                    ? "No patients match your search."
                    : "No patients have been registered yet."}
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const status = patient.bookingStatus || "—";

                return (
                  <tr key={patient.id}>
                    <td>
                      <strong>{patient.name}</strong>
                    </td>

                    <td>{patient.patientNumber}</td>

                    <td>{patient.dateOfBirth ?? "—"}</td>

                    <td>
                      {status === "—" ? (
                        "—"
                      ) : (
                        <span
                          className={`status status-${status
                            .toLowerCase()
                            .replaceAll(" ", "-")}`}
                        >
                          {status}
                        </span>
                      )}
                    </td>

                    <td>—</td>

                    <td className="patient-action-cell">
                      <button
                        type="button"
                        className="patient-schedule-button"
                        onClick={() => schedulePatient(patient.id)}
                      >
                        Add &amp; Schedule
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}