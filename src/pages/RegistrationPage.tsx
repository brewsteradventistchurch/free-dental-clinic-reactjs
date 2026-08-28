// import { FormEvent } from "react";

export default function RegistrationPage() {
  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    alert("Patient registration saved (mock data).");
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Patient registration</span>
          <h1>Register a patient</h1>
          <p>Enter the patient's information below.</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-section">
          <h2>Basic information</h2>
          <p className="form-help">
            Please use the patient's legal name whenever possible.
          </p>

          <div className="form-grid">
            <label>
              First name
              <input name="firstName" required />
            </label>

            <label>
              Last name
              <input name="lastName" required />
            </label>

            <label>
              Date of birth
              <input type="date" name="dateOfBirth" required />
            </label>

            <label>
              Phone
              <input type="tel" name="phone" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Contact information</h2>

          <div className="form-grid">
            <label>
              Address
              <input name="address" />
            </label>

            <label>
              City
              <input name="city" />
            </label>

            <label>
              State
              <select name="state" defaultValue="WA">
                <option value="WA">Washington</option>
                <option value="OR">Oregon</option>
                <option value="ID">Idaho</option>
                <option value="CA">California</option>
              </select>
            </label>

            <label>
              ZIP code
              <input name="zip" />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2>Visit information</h2>

          <div className="form-grid">
            <label>
              Reason for visit
              <select name="reason" defaultValue="">
                <option value="" disabled>
                  Select an option
                </option>
                <option>Dental pain</option>
                <option>Cleaning</option>
                <option>Extraction</option>
                <option>Evaluation</option>
                <option>Other</option>
              </select>
            </label>

            <label>
              Preferred language
              <select name="language" defaultValue="English">
                <option>English</option>
                <option>Spanish</option>
                <option>Other</option>
              </select>
            </label>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="button secondary">
            Cancel
          </button>

          <button type="submit" className="button primary">
            Save registration
          </button>
        </div>
      </form>
    </div>
  );
}