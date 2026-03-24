import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";

export function Finances() {
  const [tab, setTab] = useState("wallet");

  return (
    <div>
      <h1>Finances</h1>

      <div className="tabs">
        <button onClick={() => setTab("wallet")}>Wallet</button>
        <button onClick={() => setTab("blank")}>Blank</button>
      </div>

      {tab === "wallet" && <WalletTab />}
      {tab === "blank" && <BlankTab />}
    </div>
  );
}

function WalletTab() {
    return (
        <h1>Wallet</h1>
    );
}

function BlankTab() {
    return (
        <h1>Blank</h1>
    );
}

export function Investments() {
    return (
        <h1>Investments</h1>
    );
}

export function Analytics() {
    return (
        <h1>Analytics</h1>
    );
}

export function Settings() {
    return (
        <h1>Settings</h1>
    );
}