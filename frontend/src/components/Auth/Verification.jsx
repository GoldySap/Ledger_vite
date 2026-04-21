import { useState } from "react";

export default function VerificationModal({ type, method, onSubmit, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

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
          Enter the code sent via <b>{method}</b>
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