import { useState, useEffect } from "react";
import { Routes, Route, Link, useParams, useNavigate } from "react-router-dom";
// import axios from "axios";

const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";
const BASE_ROUTE = "/dashboard/user/investments";

const getStockQuote = async (symbol) => {
  const response = await axios.get(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
  return response.data;
};

const getStockProfile = async (symbol) => {
  const response = await axios.get(`${BASE_URL}/stock/profile2?symbol=${symbol}&token=${API_KEY}`);
  return response.data;
};

const getStockCandles = async (symbol, resolution, from, to) => {
    try {
        const response = await axios.get(
        `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${API_KEY}`
        );
        return response.data;
    } catch (err) {
        console.error("Candles API error:", err.response?.status);
        return { 
            c: [180, 182, 179, 185, 190, 188],
            t: [1,2,3,4,5,6] 
        };
    }
};

// const buyStock = (symbol, price) => {
//   setPortfolio(prev => {
//     const current = prev.holdings[symbol] || { qty: 0, avgPrice: 0 };

//     const newQty = current.qty + 1;
//     const newAvg =
//       (current.qty * current.avgPrice + price) / newQty;

//     return {
//       cash: prev.cash - price,
//       holdings: {
//         ...prev.holdings,
//         [symbol]: {
//           qty: newQty,
//           avgPrice: newAvg
//         }
//       }
//     };
//   });
// };

// const sellStock = (symbol, price) => {
//   setPortfolio(prev => {
//     const current = prev.holdings[symbol];
//     if (!current) return prev;

//     const newQty = current.qty - 1;
//     const profit = price - current.avgPrice;

//     const newHoldings = { ...prev.holdings };

//     if (newQty <= 0) delete newHoldings[symbol];
//     else newHoldings[symbol] = { ...current, qty: newQty };

//     return {
//       cash: prev.cash + price,
//       holdings: newHoldings,
//       realizedPL: (prev.realizedPL || 0) + profit
//     };
//   });
// };

function SimpleChart({ data }) {
  const width = 300;
  const height = 100;

  const safeData = data?.length ? data : [0];

  const max = Math.max(...safeData);
  const min = Math.min(...safeData);

  const points = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((p - min) / (max - min)) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ border: "1px solid #ccc" }}>
      <polyline
        fill="none"
        stroke="black"
        strokeWidth="2"
        points={points.join(" ")}
      />
    </svg>
  );
}

function Tabs() {
  return (
    <div style={{ display: "flex", gap: 20 }}>
      <Link to={`${BASE_ROUTE}/market`}>Market</Link>
      <Link to={`${BASE_ROUTE}/owned`}>Portfolio</Link>
    </div>
  );
}

function StockList({ stocks, setPortfolio }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("asc");

  const navigate = useNavigate();

  const filtered = stocks
    .filter(s => s.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sort === "asc" ? a.localeCompare(b) : b.localeCompare(a)
    );

  const buyStock = (symbol) => {
    setPortfolio(prev => {
        const price = 100;

        const current = prev.holdings[symbol] || { qty: 0, avgPrice: 0 };

        const newQty = current.qty + 1;
        const newAvg = (current.qty * current.avgPrice + price) / newQty;

        return {
            ...prev,
            cash: prev.cash - price,
            holdings: {
                ...prev.holdings,
                [symbol]: {
                    qty: newQty,
                    avgPrice: newAvg
                }
            }
        };
    });
  };

  return (
    <div>
      <h2>Stocks</h2>

      <input
        placeholder="Search stocks..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <button onClick={() => setSort(sort === "asc" ? "desc" : "asc")}>
        Sort: {sort}
      </button>

      <div style={{ marginTop: 20 }}>
        {filtered.map(stock => (
          <div
            key={stock}
            style={{
              padding: 10,
              borderBottom: "1px solid #ccc",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <span
              onClick={() => navigate(`${BASE_ROUTE}/stock/${stock}`)}
              style={{ cursor: "pointer" }}
            >
              {stock}
            </span>

            <button onClick={() => buyStock(stock)}>
              Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockDetail({ setPortfolio }) {
    const { symbol } = useParams();
    const [profile, setProfile] = useState({});
    const [quote, setQuote] = useState({});
    const [candles, setCandles] = useState({});

    useEffect(() => {
        const fetchData = async () => {
        const profileData = await getStockProfile(symbol);
        setProfile(profileData);

        const quoteData = await getStockQuote(symbol);
        setQuote(quoteData);

        const now = Math.floor(Date.now() / 1000);
        const monthAgo = now - 30 * 24 * 60 * 60;
        const candlesData = await getStockCandles(symbol, "D", monthAgo, now);
        setCandles(candlesData);
        };
        fetchData();
    }, [symbol]);

    const buyStock = (symbol, price = 0) => {
        setPortfolio(prev => {
            const current = prev.holdings[symbol] || { qty: 0, avgPrice: 0 };

            const newQty = current.qty + 1;
            const newAvg =
            (current.qty * current.avgPrice + price) / newQty;

            return {
            ...prev,
            cash: prev.cash - price,
            holdings: {
                ...prev.holdings,
                [symbol]: {
                qty: newQty,
                avgPrice: newAvg
                }
            }
            };
        });
        };

    const sellStock = (symbol, price) => {
        setPortfolio(prev => {
            const current = prev.holdings[symbol];
            if (!current) return prev;

            const newQty = current.qty - 1;
            const profit = price - current.avgPrice;

            const newHoldings = { ...prev.holdings };

            if (newQty <= 0) delete newHoldings[symbol];
            else newHoldings[symbol] = { ...current, qty: newQty };

            return {
            ...prev,
            cash: prev.cash + price,
            holdings: newHoldings,
            realizedPL: (prev.realizedPL || 0) + profit
            };
        });
        };

    return (
        <div>
            <h2>{profile.name || symbol} ({symbol})</h2>
            <p>Industry: {profile.finnhubIndustry || "N/A"}</p>
            <p>Current Price: ${quote.c || "N/A"}</p>
            <button onClick={() => buyStock(symbol, quote.c)}>Buy</button>
            <button onClick={() => sellStock(symbol, quote.c)}>Sell</button>
            <div style={{ marginTop: "20px" }}>
                <SimpleChart data={candles.c?.slice(-20) || []} />
            </div>
            <p>Last 30 days prices:</p>
            <ul>
                {candles.c?.slice(-5).map((price, i) => (
                    <li key={i}>${price}</li>
                ))}
            </ul>
        </div>
    );
}

function PortfolioDashboard({ portfolio, quotes = {} }) {
  const holdings = Object.entries(portfolio?.holdings ?? {});

  const totalValue = holdings.reduce((sum, [sym, data]) => {
    const price = quotes[sym]?.c || 0;
    return sum + price * data.qty;
  }, 0);

  const unrealizedPL = holdings.reduce((sum, [sym, data]) => {
    const price = quotes[sym]?.c || 0;
    return sum + (price - data.avgPrice) * data.qty;
  }, 0);

  return (
    <div>
      <h2>Portfolio</h2>

      <p>Cash: ${portfolio.cash.toFixed(2)}</p>
      <p>Total Value: ${(portfolio.cash + totalValue).toFixed(2)}</p>
      <p>Unrealized P/L: ${unrealizedPL.toFixed(2)}</p>
      <p>Realized P/L: ${(portfolio.realizedPL || 0).toFixed(2)}</p>

      <h3>Holdings</h3>
      {holdings.map(([sym, data]) => (
        <div key={sym}>
          {sym}: {data.qty} shares @ ${data.avgPrice.toFixed(2)}
        </div>
      ))}
    </div>
  );
}

export function Test() {
    const [portfolio, setPortfolio] = useState({
        cash: 10000,
        holdings: {},
        realizedPL: 0
    });

  const marketStocks = ["TSLA", "GOOGL", "AMZN", "NFLX"];

  const ownedList = Object.keys(portfolio.holdings || {});

  return (
    <div style={{ padding: 20 }}>
      <Tabs />
      <Routes>
        <Route path="market" element={<StockList stocks={marketStocks} setPortfolio={setPortfolio} />}/>
        <Route path="owned" element={<PortfolioDashboard portfolio={portfolio} />} />
        <Route path="stock/:symbol" element={<StockDetail setPortfolio={setPortfolio} />} />
        </Routes>
    </div>
  );
}