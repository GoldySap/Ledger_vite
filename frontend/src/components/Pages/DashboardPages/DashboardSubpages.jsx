import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import { Test } from "./test.jsx"
import "./wallet.css";
import "./investments.css";
import SettingsPage from "./settings.jsx";

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
        <>
            <h1>Wallet</h1>
            {/* From Uiverse.io by byllzz */}
            <div className="app-container">
                <div className="wallet">
                    <div className="wallet-back"></div>
                    <div className="cards">
                        <div className="card stripe">
                            <div className="card-inner">
                                <div className="card-top">
                                    <span>Stripe</span>
                                    <div className="chip"></div>
                                </div>
                                <div className="card-bottom">
                                    <div className="card-info">
                                        <span className="label">Holder</span
                                        ><span className="value">ALEX SMITH</span>
                                    </div>
                                    <div className="card-number-wrapper">
                                        <span className="hidden-stars">**** 4242</span>
                                        <span className="card-number">5524 9910 4242</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card wise">
                            <div className="card-inner">
                                <div className="card-top">
                                    <span>Wise</span>
                                    <div className="chip"></div>
                                </div>
                                <div className="card-bottom">
                                    <div className="card-info">
                                        <span className="label">Business</span
                                        ><span className="value">STUDIO LLC</span>
                                    </div>
                                    <div className="card-number-wrapper">
                                        <span className="hidden-stars">**** 8810</span>
                                        <span className="card-number">9012 4432 8810</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card paypal">
                            <div className="card-inner">
                                <div className="card-top">
                                    <span>Pay<b style={{ color: "#0079C1"}}>Pal</b></span>
                                    <div className="chip"></div>
                                </div>
                                <div className="card-bottom">
                                    <div className="card-info">
                                        <span className="label">Email</span
                                        ><span className="value">hello@work.com</span>
                                    </div>
                                    <div className="card-number-wrapper">
                                        <span className="hidden-stars">**** 0094</span>
                                        <span className="card-number">3312 0045 0094</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pocket">
                        <svg className="pocket-svg" viewBox="0 0 280 160" fill="none">
                            <path
                            d="M 0 20 C 0 10, 5 10, 10 10 C 20 10, 25 25, 40 25 L 240 25 C 255 25, 260 10, 270 10 C 275 10, 280 10, 280 20 L 280 120 C 280 155, 260 160, 240 160 L 40 160 C 20 160, 0 155, 0 120 Z"
                            fill="#1e341e"
                            ></path>
                            <path
                            d="M 8 22 C 8 16, 12 16, 15 16 C 23 16, 27 29, 40 29 L 240 29 C 253 29, 257 16, 265 16 C 268 16, 272 16, 272 22 L 272 120 C 272 150, 255 152, 240 152 L 40 152 C 25 152, 8 152, 8 120 Z"
                            stroke="#3d5635"
                            strokeWidth="1.5"
                            strokeDasharray="6 4"
                            ></path>
                        </svg>
                        <div className="pocket-content">
                            <div style={{position: "relative", height: "24px", width: "100%"}}>
                                <div className="balance-stars">******</div>
                                <div className="balance-real">$12,450.00</div>
                            </div>
                            <div style={{color: "#698263", fontSize: "12px", fontWeight: 500}}>Total Balance</div>
                            <div className="eye-icon-wrapper">
                                <svg
                                    className="eye-icon eye-slash"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                    <line x1="3" y1="3" x2="21" y2="21"></line>
                                </svg>
                                <svg
                                    className="eye-icon eye-open"
                                    style={{opacity: 0}}
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function BlankTab() {
    return (
        <h1>Blank</h1>
    );
}

export function Investments() {
    const [activeTab, setActiveTab] = useState("portfolio");

    return (
        <div className="investments-container">
            <h1>Investments</h1>

            <div className="tab-nav">
                <button onClick={() => setActiveTab("portfolio")}>Portfolio</button>
                <button onClick={() => setActiveTab("market")}>Market</button>
                <button onClick={() => setActiveTab("watchlist")}>Watchlist</button>
                <button onClick={() => setActiveTab("test")}>Test</button>
            </div>

            {activeTab === "portfolio" && <PortfolioTab />}
            {activeTab === "market" && <MarketTab />}
            {activeTab === "watchlist" && <WatchlistTab />}
            {activeTab === "test" && <Test />}
        </div>
    );
}

function PortfolioTab() {
  const { call } = useApi();
  const [data, setData] = useState(null);

  useEffect(() => {
    call("/api/investment/portfolio")
      .then(setData)
      .catch(console.error);
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <div>
      <h2>Your Portfolio</h2>

      <div className="portfolio-summary">
        <p>Total Value: ${data.total_value}</p>
        <p>Total Gain/Loss: ${data.total_gain_loss}</p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Qty</th>
            <th>Buy Price</th>
            <th>Current</th>
            <th>Value</th>
            <th>Gain %</th>
          </tr>
        </thead>

        <tbody>
          {data.holdings.map(h => (
            <tr key={h.id}>
              <td>{h.symbol}</td>
              <td>{h.quantity}</td>
              <td>{h.avg_buy_price}</td>
              <td>{h.current_price}</td>
              <td>{h.current_value}</td>
              <td style={{ color: h.gain_loss_pct >= 0 ? "lime" : "red" }}>
                {h.gain_loss_pct}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarketTab() {
  const { call } = useApi();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);

  async function fetchDefault() {
    const res = await call("/api/investments/market/live");
    setResults(res);
  }

  async function search() {
    if (!query) return;
    const res = await call(`/api/investments/search?q=${query}`);
    setResults(res.results);
  }

  useEffect(() => {
    fetchDefault();

    const interval = setInterval(() => {
      fetchDefault();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h2>Market</h2>

      <input
        placeholder="Search stocks..."
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      <button onClick={search}>Search</button>

      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Name</th>
            <th>Price</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {results.map(r => (
            <tr key={r.id || r.symbol}>
              <td>{r.symbol}</td>
              <td>{r.name}</td>
              <td>${r.current_price}</td>
              <td>
                <button onClick={() => setSelectedStock(r)}>
                  Trade
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedStock && (
        <TradeModal
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          refresh={search}
        />
      )}
    </div>
  );
}

function TradeModal({ stock, onClose, refresh }) {
    const { call } = useApi();
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    async function handleBuy() {
        setLoading(true);
        await call("/api/investments/holdings/buy", {
            method: "POST",
            body: JSON.stringify({
                investment_id: stock.id,
                quantity
            })
        });
        setLoading(false);
        refresh();
        onClose();
    }

    async function handleSell() {
        setLoading(true);
        await call(`/api/investments/holdings/${stock.holding_id}/sell`, {
            method: "POST",
            body: JSON.stringify({ quantity })
        });
        setLoading(false);
        refresh();
        onClose();
    }

    const total = (quantity * stock.current_price).toFixed(2);

    return (
        <div className="modal-backdrop">
            <div className="modal">
                <h2>{stock.name} ({stock.symbol})</h2>
                <p>Price: ${stock.current_price}</p>

                <input
                    type="number"
                    value={quantity}
                    min={1}
                    onChange={e => setQuantity(Number(e.target.value))}
                />

                <p>Total: ${total}</p>

                <div className="actions">
                    <button onClick={handleBuy} disabled={loading}>
                        Buy
                    </button>

                    <button onClick={handleSell} disabled={loading}>
                        Sell
                    </button>

                    <button onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
}

function WatchlistTab() {
    const { call } = useApi();
    const [items, setItems] = useState([]);

    async function load() {
        const res = await call("/api/investment/watchlist");
        setItems(res.watchlist);
    }

    async function remove(id) {
        await call(`/api/investment/watchlist/${id}`, { method: "DELETE" });
        load();
    }

    useEffect(() => {
        load();
    }, []);

    return (
        <div>
        <h2>Watchlist</h2>

        <table>
            <thead>
            <tr>
                <th>Symbol</th>
                <th>Name</th>
                <th>Price</th>
                <th></th>
            </tr>
            </thead>

            <tbody>
            {items.map(i => (
                <tr key={i.id}>
                <td>{i.symbol}</td>
                <td>{i.name}</td>
                <td>${i.current_price}</td>
                <td>
                    <button onClick={() => remove(i.id)}>Remove</button>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
    );
}

export function Analytics() {
    return (
        <h1>Analytics</h1>
    );
}

export function Settings() {
    return (
        <SettingsPage />
    );
}