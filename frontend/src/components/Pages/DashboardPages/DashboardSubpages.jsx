import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import { Test } from "./test.jsx"
import FinancesPage from "./finances.jsx"
import InvestmentsPage from "./investments.jsx";
import AnalyticsPage from "./Analytics.jsx";
import "./wallet.css";
import "./investments.css";
import SettingsPage from "./settings.jsx";

export function Finances() {
    return (
        <FinancesPage />
    );
}

export function Investments() {
    return <InvestmentsPage />;
}

export function Analytics() {
    return <AnalyticsPage />;
}

export function Settings() {
    return <SettingsPage />;
}