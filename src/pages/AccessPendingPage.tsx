export default function AccessPendingPage() {

    const handleLogout = () => {
        window.location.href = "/logout";
    };

    return (
        <div className="access-page">
            <div className="access-card">
                <div className="access-icon">⏳</div>

                <h1>Access Pending</h1>

                <p>
                    Thanks for signing in. Your account has been registered,
                    but it has not been approved yet.
                </p>

                <p>
                    Please contact the clinic administrator if you believe
                    you should already have access.
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