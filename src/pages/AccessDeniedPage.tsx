export default function AccessDeniedPage() {
    const handleLogout = () => {
        window.location.href = "/logout";
    };

    return (
        <div className="access-page">
            <div className="access-card">
                <div className="access-icon">🔒</div>

                <h1>Access Denied</h1>

                <p>
                    Your account is not currently authorized to use the
                    dental clinic application.
                </p>

                <p>
                    If you believe this is a mistake, please contact the
                    clinic administrator.
                </p>

                <button
                    type="button"
                    className="access-button"
                    onClick={handleLogout}
                >
                    Sign out
                </button>
            </div>
        </div>
    );
}