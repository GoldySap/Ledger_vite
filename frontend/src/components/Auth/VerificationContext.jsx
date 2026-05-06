import { createContext, useContext, useState } from "react";
import VerificationModal from "./Verification";

const VerificationContext = createContext();

export function VerificationProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [resolver, setResolver] = useState(null);
  function requestCodeInput({ methods = [], message }) {
    return new Promise((resolve, reject) => {
      setConfig({ methods, message });
      setResolver(() => ({ resolve, reject }));
    });
  }

  async function handleSubmit(code) {
    resolver.resolve(code);
    close();
  }

  function close() {
    setConfig(null);
    setResolver(null);
  }

  return (
    <VerificationContext.Provider value={{ requestCodeInput }}>
      {children}

      {config && (
        <VerificationModal
          methods={config.methods}
          message={config.message}
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