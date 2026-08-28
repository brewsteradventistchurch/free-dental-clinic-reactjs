import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { patients as schedulePatients } from "../schedule/mockScheduleData";

const patientStatuses: Record<string, { status: string; provider: string }> = {
  "patient-1": { status: "Waiting", provider: "—" },
  "patient-2": { status: "With provider", provider: "Dr. Smith" },
  "patient-3": { status: "Completed", provider: "Dr. Johnson" },
  "patient-4": { status: "Waiting", provider: "—" },
  "patient-5": { status: "Waiting", provider: "—" },
};

const patients = schedulePatients.map((patient) => ({
  ...patient,
  name: `${patient.firstName} ${patient.lastName}`,
  dob: "—",
  status: patientStatuses[patient.id]?.status ?? "Waiting",
  provider: patientStatuses[patient.id]?.provider ?? "—",
}));

export default function ListsPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filteredPatients = patients.filter((patient) =>
    `${patient.name} ${patient.id}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

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

        <select defaultValue="all">
          <option value="all">All statuses</option>
          <option>Waiting</option>
          <option>With provider</option>
          <option>Completed</option>
        </select>
      </div>

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
            {filteredPatients.map((patient) => (
              <tr key={patient.id}>
                <td>
                  <strong>{patient.name}</strong>
                </td>
                <td>{patient.id}</td>
                <td>{patient.dob}</td>
                <td>
                  <span
                    className={`status status-${patient.status
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    {patient.status}
                  </span>
                </td>
                <td>{patient.provider}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}