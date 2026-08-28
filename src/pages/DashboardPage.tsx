import { Link } from "react-router-dom";

const stats = [
  {
    label: "Registered patients",
    value: "124",
    detail: "This clinic",
  },
  {
    label: "Waiting",
    value: "37",
    detail: "Currently checked in",
  },
  {
    label: "Appointments today",
    value: "18",
    detail: "6 remaining",
  },
];

const recentPatients = [
  {
    id: "PAT-2026-0124",
    name: "Maria Garcia",
    status: "Waiting",
    time: "9:15 AM",
  },
  {
    id: "PAT-2026-0123",
    name: "James Wilson",
    status: "With provider",
    time: "9:00 AM",
  },
  {
    id: "PAT-2026-0122",
    name: "Ana Martinez",
    status: "Completed",
    time: "8:45 AM",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Clinic overview</span>
          <h1>Good morning</h1>
          <p>Here is what is happening at the clinic today.</p>
        </div>
      </div>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>{stat.detail}</small>
          </div>
        ))}
      </section>

      <section className="quick-actions">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Quick actions</span>
            <h2>What would you like to do?</h2>
          </div>
        </div>

        <div className="action-grid">
          <Link to="/registration" className="action-card primary-action">
            <span className="action-icon">+</span>
            <strong>Register patient</strong>
            <span>Start a new patient registration</span>
          </Link>

          <Link to="/lists" className="action-card">
            <span className="action-icon">≡</span>
            <strong>View patients</strong>
            <span>Search and manage today's patients</span>
          </Link>

          <Link to="/print" className="action-card">
            <span className="action-icon">▣</span>
            <strong>Print lists</strong>
            <span>Print registration and provider lists</span>
          </Link>
        </div>
      </section>

      <section className="recent-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Today</span>
            <h2>Recent patients</h2>
          </div>

          <Link to="/lists" className="text-link">
            View all
          </Link>
        </div>

        <div className="table-card">
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>ID</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>

            <tbody>
              {recentPatients.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <strong>{patient.name}</strong>
                  </td>
                  <td>{patient.id}</td>
                  <td>
                    <span
                      className={`status status-${patient.status
                        .toLowerCase()
                        .replaceAll(" ", "-")}`}
                    >
                      {patient.status}
                    </span>
                  </td>
                  <td>{patient.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}