import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import FinancesPage from "./finances.jsx"
import InvestmentsPage from "./investments.jsx";
import AnalyticsPage from "./Analytics.jsx";
import SettingsPage from "./settings.jsx";
import { SubscriptionGate } from "../../Auth/SubscriptionGate.jsx"
import "./wallet.css";
import "./investments.css";

export function Finances() {
    return (<FinancesPage />)
}

export function Investments() {
    return (<InvestmentsPage />)
}

export function Analytics() {
    return (<AnalyticsPage />)
}

export function Settings() {
    return <SettingsPage />;
}