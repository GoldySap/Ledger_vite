import { useState } from "react";
import "./settings.css";

export default function SettingsPage() {
    const [tab, setTab] = useState("account");
    return (
        <>
            <h1>Settings</h1>
            <div class="settings-layout">
                <div class="tabs">
                    <div class="tab active" onClick={() => setTab("account")}>Account</div>
                    <div class="tab" onClick={() => setTab("security")}>Security</div>
                    <div class="tab" onClick={() => setTab("subscription")}>Subscription</div>
                    <div class="tab" onClick={() => setTab("payments")}>Payments</div>
                    <div class="tab" onClick={() => setTab("history")}>History</div>
                </div>
                
                <div class="settings-content">
                    {tab === "account" && <AccountTab />}
                    {tab === "security" && <SecurityTab />}
                    {tab === "subscription" && <SubscriptionTab />}
                    {tab === "payments" && <PaymentsTab />}
                    {tab === "history" && <HistoryTab />}
                </div>
            </div>
        </>
    )
}

function AccountTab() {
    return (
        <div id="account" class="tab-section active">
            <form>
                <h2>Account details</h2>
                <label>Username</label>
                <input name="username" type="text" disabled/>
                <label>Email</label>
                <input name="email" type="email"/>
                <label>Phone number</label>
                <input name="phonenumber" type="phonenumber"/>
                <button class="primary" type="submit">Save changes</button>
            </form>
        </div>
    )
}

function SecurityTab() {
    return ( 
        <div id="security" class="tab-section">
            <form>
                <h2>Security</h2>
                <h3>Two-Factor App (TFA/2FA)</h3>
                <input type="text"/>
                {/* <label><input name="email_2FA" type="checkbox" {% if g.security.email_2fa_enabled %}checked{% endif %}>Email 2FA</label> */}
                {/* <label><input name="sms_2FA" type="checkbox" {% if g.security.sms_2fa_enabled %}checked{% endif %}>SMS 2FA</label> */}
                <p>Email verified:
                {/* {% if g.security.verified %} */}
                    Verified
                {/* {% else %} */}
                    Not verified
                </p>
                <button class="primary" type="submit">Update security</button>
                <p id="securityStatus" class="status"></p>
                {/* <hr> */}
                <h3>Authenticator App (TOTP)</h3>
                {/* {% if g.security.totp_enabled %} */}
                    <p>Authenticator is enabled</p>
                    <a href="{{ url_for('totp_disable') }}"><button type="button" class="primary">Disable Authenticator</button></a>
                {/* {% else %} */}
                    <p>Authenticator is disabled</p>
                    <a href="{{ url_for('totp_setup') }}"><button type="button" class="primary">Enable Authenticator</button></a>
            </form>
        </div>
    )
}

function SubscriptionTab() {
    return (
        <div id="subscription" class="tab-section">
            <form id="subscriptionForm">
                <h2>Subscription</h2>
                {/* <p><strong>Current plan:</strong> {{ g.subscription.label | capitalize }}</p> */}
                {/* {% if g.subscription.price != 0 %} */}
                    {/* <p><strong>Price:</strong> {{ g.subscription.price }} $ / month</p> */}
                {/* {% else %} */}
                    <p><strong>Price:</strong> 0 $ / month</p>
                {/* {% endif %} */}
                {/* {% if g.subscription.label != "pro" %} */}
                    <button class="primary" type="submit">Upgrade to Pro</button>
            </form>
        </div>
    )
}

function PaymentsTab() {
    return (
        <div id="payments" class="tab-section">
            <form>
                <h2>Saved cards</h2>
                {/* {% for card in cards %} */}
                <p>
                    {/* CARD: **** **** **** {{ card.cardnumber[-4:] }} */}
                    {/* {% if card.active %}(Active){% endif %} */}
                </p>
                {/* {% else %} */}
                <p>No cards saved</p>
            </form>
        </div>
    )
}

function HistoryTab() {
    return (
        <div id="history" class="tab-section">
            <form>
                <h2>Account activity</h2>
                <ul>
                {/* {% for event in history %} */}
                    {/* <li>{{ event.action }} – {{ event.created_at }}</li> */}
                {/* {% else %} */}
                    <li>No history available</li>
                </ul>
            </form>
        </div>
    )
}