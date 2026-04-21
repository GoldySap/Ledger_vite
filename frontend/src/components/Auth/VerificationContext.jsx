import { createContext, useContext, useState } from "react";
import { useApi } from "../API/useApi";

const VerificationContext = createContext();

export function VerificationProvider({ children }) {
  const { call } = useApi();

  const [config, setConfig] = useState(null);
  const [resolver, setResolver] = useState(null);

  async function requestVerification({ type, method }) {
    await call("/api/security/send", {
      method: "POST",
      body: JSON.stringify({ type, method }),
    });

    return new Promise((resolve) => {
      setConfig({ type, method });
      setResolver(() => resolve);
    });
  }

  async function handleSubmit(code) {
    try {
      await call("/api/security/verify", {
        method: "POST",
        body: JSON.stringify({
          code,
          type: config.type,
        }),
      });

      resolver(code);
      close();
    } catch (err) {
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
            resolver(false);
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