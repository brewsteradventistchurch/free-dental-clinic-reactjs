import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">+</div>
          <div>
            <strong>Free Dental Clinic</strong>
            <span>Volunteer Portal</span>
          </div>
        </div>

        <nav className="main-nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/schedule">Scheduler</NavLink>
          <NavLink to="/registration">Registration</NavLink>
          <NavLink to="/lists">Patients</NavLink>
          <NavLink to="/print">Print</NavLink>
          {user?.role.toLowerCase() === "admin" && (
            <NavLink to="/config">Configuration</NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="avatar">
              {user?.firstName?.charAt(0)}
              {user?.lastName?.charAt(0)}
            </div>

            <div className="user-info">
              <strong>
                {user?.firstName} {user?.lastName}
              </strong>
              <span>{user?.role}</span>
            </div>
          </div>

          <button className="logout-button" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="event-label">2026 Clinic</span>
          </div>

          <div className="topbar-user">
            {user?.email}
          </div>
        </header>

        <div className="page-scroll">
          <div className="page-content">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}