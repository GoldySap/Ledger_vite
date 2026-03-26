import { useState, useEffect, useRef } from "react";
import { useApi } from "../../API/useApi";
import "./admin.css";

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

function AdminTable({ endpoint }) {
    const { call } = useApi();
    const rowRefs = useRef({});
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState([]);

    useEffect(() => {
        call(endpoint)
            .then(res => {
            console.log("API RESPONSE:", res);
            setColumns(res?.columns || []);
            setData(res?.data || []);
            })
            .catch(err => {
            console.error("TABLE ERROR:", err);
            setColumns([]);
            setData([]);
            });
    }, [endpoint]);

    async function saveChanges() {
        const code = prompt("Enter admin verification code");
        await call(`${endpoint}/bulk`, {
            method: "PUT",
            body: JSON.stringify({ updates: rowRefs.current, code }),
        });
        rowRefs.current = {};
    }

    // async function saveChanges() {
    //     const updates = Object.entries(rowRefs.current);
    //     for (const [id, changes] of updates) {
    //         await call(`${endpoint}/${id}`, {
    //         method: "PUT",
    //         body: JSON.stringify(changes),
    //         });
    //     }
    // }

  return (
    <>
        <button onClick={saveChanges} disabled={!Object.keys(rowRefs.current).length}>Save Changes</button>
        <table>
            <thead>
                <tr>
                {columns.map(col => <th key={col}>{col}</th>)}
                </tr>
            </thead>

            <tbody>
                {data.map(row => (
                <tr 
                    key={row.id}
                    style={{background: rowRefs.current[row.id] ? "#fff3cd" : "transparent"}}
                >
                    {columns.map(col => (
                    <td key={col}>
                        {typeof row[col] === "boolean" ? (
                        <input
                            type="checkbox"
                            defaultChecked={row[col]}
                            ref={el => {if (!rowRefs.current[row.id]) rowRefs.current[row.id] = {};}}
                            onChange={e => {rowRefs.current[row.id][col] = e.target.checked;}}
                        />
                        ) : // typeof row[col] === "number" ? (
                        // <input
                        //     defaultValue={row[col]}
                        //     ref={el => (rowRefs.current[row.id] = rowRefs.current[row.id] || {})}
                        //     onChange={e => {rowRefs.current[row.id][col] = Number(e.target.value);}}
                        // />
                        (<input
                            defaultValue={row[col] ?? ""}
                            ref={el => {if (!rowRefs.current[row.id]) rowRefs.current[row.id] = {};}}
                            onChange={e => {rowRefs.current[row.id][col] = typeof row[col] === "number" ? Number(e.target.value) : e.target.value;}}
                        />
                        // ) : (
                        // <input
                        //     defaultValue={row[col] || ""}
                        //     ref={el => (rowRefs.current[row.id] = rowRefs.current[row.id] || {})}
                        //     onChange={e => {rowRefs.current[row.id][col] = e.target.value;}}
                        // />
                        )}
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
        </table>
    </>
  );
}

function UsersTab() {
    return (
        <div>
            <h2>Users</h2>
            <CreateUser />
            <AdminTable endpoint={"/api/admin/users"}/>
        </div>
    );
}

function CreateUser({ refresh }) {
  const { call } = useApi();
  const [form, setForm] = useState({ email: "", password: "" });

  async function submit() {
    await call("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(form),
    });
    refresh();
  }

  return (
    <div>
      <input placeholder="Email" onChange={e => setForm({...form, email: e.target.value})}/>
      <input placeholder="Password" onChange={e => setForm({...form, password: e.target.value})}/>
      <button onClick={submit}>Create</button>
    </div>
  );
}

function SubscriptionsTab() {
    return (
        <div>
            <h2>Subscriptions</h2>
            <CreateSubscription />
            <AdminTable endpoint={"/api/admin/subscriptions"}/>
        </div>
    );
}

function CreateSubscription({ refresh }) {
  const { call } = useApi();
  const [form, setForm] = useState({ label: "", price: "" });

  async function submit() {
    await call("/api/admin/subscriptions", {
      method: "POST",
      body: JSON.stringify(form),
    });
    refresh();
  }

  return (
    <div>
      <input placeholder="Label" onChange={e => setForm({...form, label: e.target.value})}/>
      <input placeholder="Price" onChange={e => setForm({...form, price: e.target.value})}/>
      <button onClick={submit}>Create</button>
    </div>
  );
}

export function AdminAnalytics() {
    return (
        <h1>Analytics</h1>
    );
}

export function Logs() {
    return (
        <h1>Audit Logs</h1>
    );
}