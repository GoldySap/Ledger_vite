import { useState } from "react";

export default function VerificationModal({ methods, message, onSubmit, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const primaryMethod = methods?.includes("totp")
    ? "Authenticator app"
    : methods?.[0] || "verification";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      await onSubmit(code);
    } catch (err) {
      setError(err.message || "Invalid code");
    }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <h3>Verification Required</h3>

        <p>
          {message || `Enter the code from your ${primaryMethod}`}
        </p>

        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            required
          />

          <button>Verify</button>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}