import { createContext, useContext, useState } from "react";
import { useApi } from "../API/useApi";
import VerificationModal from "./Verification";

const VerificationContext = createContext();

export function VerificationProvider({ children }) {
  const { call } = useApi();

  const [config, setConfig] = useState(null);
  const [resolver, setResolver] = useState(null);

  async function requestVerification({ type, method, email }) {
    await call("/api/security/send/public", {
      method: "POST",
      body: JSON.stringify({
        email,
        type,
        method
      })
    });

    return new Promise((resolve, reject) => {
      setConfig({ type, method, email });
      setResolver(() => ({ resolve, reject }));
    });
  }

  async function handleSubmit(code) {
    try {
      await call("/api/security/verify/public", {
        method: "POST",
        body: JSON.stringify({
          email: config.email,
          code,
          type: config.type
        }),
      });

      resolver.resolve(code);
      close();
    } catch (err) {
      resolver.reject(err);
      throw err;
    }
  }

  function close() {
    setConfig(null);
    setResolver(null);
  }

  return (
    <VerificationContext.Provider value={{ requestVerification }}>
      {children}

      {config && (
        <VerificationModal
          type={config.type}
          method={config.method}
          onSubmit={handleSubmit}
          onCancel={() => {
            resolver?.reject(new Error("Cancelled"));
            close();
          }}
        />
      )}
    </VerificationContext.Provider>
  );
}

export function useVerification() {
  return useContext(VerificationContext);
}