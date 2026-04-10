import { useState, useEffect } from "react";
import { useApi } from "../../API/useApi";
import { App } from "./test"
import "./investments.css";

export default function InvestmentsPage() {
    const [tab, setTab] = useState("portfolio");

    return (
        <div className="investments-container">
            <h1>Investments</h1>

            <div className="tab-nav">
                <button onClick={() => setTab("portfolio")}>Portfolio</button>
                <button onClick={() => setTab("market")}>Market</button>
                <button onClick={() => setTab("watchlist")}>Watchlist</button>
                <button onClick={() => setTab("test")}>Test</button>
            </div>

            {tab === "portfolio" && <PortfolioTab />}
            {tab === "market" && <MarketTab />}
            {tab === "watchlist" && <WatchlistTab />}
            {tab === "test" && <App />}
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

  async function handleSell() {
    alert("Sell from portfolio instead");
  }

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
              <td>
                <button onClick={() => setSelectedStock(h)}>Trade</button>
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