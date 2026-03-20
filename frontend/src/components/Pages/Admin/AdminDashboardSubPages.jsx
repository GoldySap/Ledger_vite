import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";

export function Management() {
  const [tab, setTab] = useState("users");

  return (
    <div>
      <h1>Admin Management</h1>

      <div className="tabs">
        <button onClick={() => setTab("users")}>Users</button>
        <button onClick={() => setTab("subs")}>Subscriptions</button>
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "subs" && <SubscriptionsTab />}
    </div>
  );
}

export function UsersTab() {
  const { call } = useApi();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    call("/api/admin/admin/users")
      .then(setUsers)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>Users</h2>

      {users.map(u => (
        <div key={u.id}>
          {u.email} | {u.role} | {u.active ? "Active" : "Disabled"}
        </div>
      ))}
    </div>
  );
}

export function UsersTab() {
  const { call } = useApi();
  const [subsriptions, setSubsriptions] = useState([]);

  useEffect(() => {
    call("/api/admin/admin/subsriptions")
      .then(setSubsriptions)
      .catch(console.error);
  }, []);

  return (
    <div>
      <h2>Users</h2>

      {subsriptions.map(s => (
        <div key={s.id}>
          {s.label} | {s.prive} | {s.created_at}
        </div>
      ))}
    </div>
  );
}