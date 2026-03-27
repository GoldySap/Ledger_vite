import os, requests

FINNHUB_API_KEY = os.environ.get("FINNHUB_API_KEY")

BASE_URL = "https://finnhub.io/api/v1"

def fetch_stock(symbol):
    url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_API_KEY}"
    res = requests.get(url).json()

    return {
        "symbol": symbol,
        "current_price": res.get("c", 0),
        "price_change_percent": res.get("dp", 0)
    }

def get_quote(symbol):
    url = f"{BASE_URL}/quote"
    params = {
        "symbol": symbol,
        "token": FINNHUB_API_KEY
    }
    res = requests.get(url).json()

    return {
        "price": res.get("c", 0),
        "change_percent": res.get("dp", 0)
    }