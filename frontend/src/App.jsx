import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthPage } from "./components/Auth/Login";
import { Home } from "./components/Pages/HomePages/Home";
import { HomeLayout } from "./components/Layout/HomeLayout";
import Dashboard from "./components/Pages/DashboardPages/Dashboard";
import { Settings, Finances, Investments, Analytics } from "./components/Pages/DashboardPages/DashboardSubpages";
import { Management, AdminAnalytics, Logs, AdminOverview, AdminFaq } from "./components/Pages/Admin/AdminDashboardSubPages";
import { DashboardLayout, AdminDashboardLayout } from "./components/Layout/DashboardLayout";
import { AuthProvider } from "./components/Auth/AuthContext";
import { ProtectedRoute  } from "./components/Auth/ProtectedRoute";
import { VerificationProvider } from "./components/Auth/VerificationContext";
import FaqPage from "./components/Pages/HomePages/faq";
import { AccessProvider, SubscriptionGate } from "./components/Auth/SubscriptionGate"
import '@icon/themify-icons/themify-icons.css';
import "./components/Nav/Nav.css";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <VerificationProvider>
        <BrowserRouter>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<HomeLayout />}>
              <Route index element={<Home />} />
              <Route path="features" element={<h1>Features</h1>} />
              <Route path="plan" element={<h1>Plans</h1>} />
              <Route path="support" element={<FaqPage />} />
              <Route path="login" element={<AuthPage />} />
              <Route path="*" element={<h1>404 Not Found</h1>} />
            </Route>
            
            {/* AUTH ROUTES */}
            <Route path="/2fa" element={<h1>Two Factor</h1>} />

            {/* DASHBOARD USER */}
            <Route path="/dashboard/user/*" element={
                <ProtectedRoute>
                  <AccessProvider>
                      <DashboardLayout />
                  </AccessProvider>
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="home" />} />
              <Route path="home" element={<Dashboard />} />
              <Route path="settings" element={<Settings />} />
              <Route path="finances" element={
                <SubscriptionGate feature="has_finance_access" fallback={<Finances />}>
                  <Finances />
                </SubscriptionGate>
                } 
              />
              <Route path="investments/*" element={
                <SubscriptionGate feature="has_investment_access" fallback={<Investments />}>
                  <Investments />
                </SubscriptionGate>
                } 
              />
              <Route path="analytics" element={
                <SubscriptionGate feature="has_analytics_access" fallback={<Analytics />}>
                  <Analytics />
                </SubscriptionGate>
                } 
              />
            </Route>

            {/* DASHBOARD ADMIN */}
            <Route path="/dashboard/admin/*" element={
                <ProtectedRoute>
                  <AdminDashboardLayout />
                </ProtectedRoute>
              }>
              <Route index element={<Navigate to="home" />} />
              <Route path="home" element={<AdminOverview />} />
              <Route path="management" element={<Management />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="auditlogs" element={<Logs />} />
              <Route path="faq" element={<AdminFaq />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VerificationProvider>
    </AuthProvider>
  );
}

export default App;