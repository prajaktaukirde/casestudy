# Technical Challenges & Engineering Solutions

**Author:** Prajakta Ukirde  
**Project:** Dynamic Portfolio Dashboard (Next.js, TypeScript, Tailwind, Node.js)  

---

## Executive Summary

During the development of the Dynamic Portfolio Dashboard, several architectural and data-fetching challenges emerged—particularly regarding unofficial financial APIs, rate limiting, exchange ticker resolution, and real-time frontend recalculation. This document details each challenge encountered and the specific technical solutions implemented.

---

## 1. Challenge: Absence of Public REST APIs for Yahoo & Google Finance

### Problem Statement
Neither Yahoo Finance nor Google Finance provides free, unauthenticated, public REST APIs for real-time stock prices or fundamental ratios. 
- Yahoo Finance's legacy `/v7/finance/quote` batch endpoint currently returns `401 Unauthorized` without session cookies and crumb tokens.
- Google Finance does not publish an API for fundamentals (P/E ratio, quarterly earnings) and frequently responds with `302 Found` redirects.

### Solution & Implementation
1. **Yahoo Finance `/v8/finance/chart/{symbol}` Endpoint:**
   - Instead of blocked quote endpoints, the application leverages Yahoo Finance’s v8 chart endpoint (`https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d`), which remains accessible, fast, and provides real-time market prices (`regularMarketPrice`) and currency metadata.
2. **Server-Side Google Finance Scraper:**
   - Developed a Node.js scraper running inside the Next.js API route that follows HTTP 302 redirects with realistic browser headers (`User-Agent`, `Accept-Language`).
   - Extracts the latest Trailing Twelve Months (TTM) P/E ratio and Earnings Per Share (EPS) via regex matching against Google Finance DOM patterns.

---

## 2. Challenge: Rate Limiting & Aggressive Polling (HTTP 429 Risks)

### Problem Statement
The assignment requires refreshing Current Market Price (CMP), Present Value, and Gain/Loss every **15 seconds**. With 26 holdings across 6 sectors:
- Fetching quotes directly from the client browser every 15 seconds would produce $>100$ requests per minute, triggering immediate IP blacklisting and HTTP `429 Too Many Requests`.
- Multiple connected users would multiply traffic exponentially.

### Solution & Implementation
1. **Server-Side In-Memory Caching (15s TTL):**
   - Implemented an in-memory cache on the Node.js backend.
   - When a client requests `/api/portfolio`, the server checks whether the cached data is younger than 15,000 ms.
   - If valid, the cached result is returned in $<10$ ms without making any outbound external network calls.
2. **Asynchronous Batching with `Promise.allSettled`:**
   - When cache expiration occurs, external requests are dispatched concurrently using `Promise.allSettled`.
   - Even if one stock's fetch times out or fails, the remaining 25 stocks resolve smoothly.
3. **Optimistic Client-Side Countdown:**
   - The frontend synchronizes a local 15-second countdown timer with the server cache, keeping the UI snappy and informative.

---

## 3. Challenge: Ticker Symbol Discrepancies & Scrip Code Normalization

### Problem Statement
The portfolio Excel sheet contained mixed identifier formats:
- Some rows used NSE ticker strings (`HDFCBANK`, `BAJFINANCE`, `AFFLE`).
- Other rows used BSE numerical scrip codes (`532174` for ICICI Bank, `544252` for Bajaj Housing, `500400` for Tata Power).
- Obscure stocks like Savani Financials trade primarily on the BSE (`511577.BO`), while others trade on the NSE (`.NS`).

### Solution & Implementation
- Constructed a data model (`lib/portfolio-data.json`) that decouples display symbols from external provider symbols:
  - `symbol`: The original identifier from the user's sheet.
  - `yahooSymbol`: Normalized for Yahoo (`.NS` for NSE, `.BO` for BSE).
  - `googleSymbol`: Normalized for Google (`:NSE` or `:BOM`).
- Mapped numerical BSE scrip codes to their primary liquid exchange symbols, ensuring 100% quote retrieval reliability.

---

## 4. Challenge: Real-Time Dynamic Recalculation & Render Performance

### Problem Statement
Every 15 seconds, new prices arrive. Recalculating:
- Present Value ($\text{CMP} \times \text{Qty}$)
- Gain/Loss ($\text{Present Value} - \text{Investment}$)
- Percentage Returns
- Sector-level summaries ($\sum \text{Invested}, \sum \text{Value}, \sum \text{P\&L}$)
- Sorting and search filters  
could cause table jitter, layout lag, or excessive DOM re-renders.

### Solution & Implementation
1. **Server-Side Pre-computation:**
   - The API route computes all mathematical formulas and sector aggregates before sending JSON to the client, reducing client CPU load.
2. **React `useMemo` for Filtering & Sorting:**
   - Filtered stocks, sorted columns, and sector rollups are memoized using React `useMemo`.
   - Keystrokes in the search bar filter instantly across name, ticker, and sector without triggering unnecessary network fetches.
3. **Collapsible Sector Groups:**
   - Users can collapse and expand sector cards/accordions, with sector subtotals always visible at the top.

---

## 5. Challenge: Resilience & Graceful Degradation

### Problem Statement
External finance websites occasionally undergo DOM layout updates, rate throttle specific subnets, or close during off-market hours.

### Solution & Implementation
1. **Fallback Baselines:**
   - Each stock holding stores baseline metrics derived from the original portfolio sheet.
   - If an external call times out (enforced by a 4-second `AbortController`), the application gracefully falls back to the baseline price, ensuring zero crashes.
2. **User Notification & Manual Retry:**
   - A non-intrusive alert banner notifies the user if an upstream feed is slow, and a manual "Refresh" button provides instant retry capability.

---

## Conclusion

By isolating external API logic behind a caching Next.js API layer, normalizing exchange identifiers, and leveraging React's reactive state model, the application achieves real-time financial tracking with minimal latency, zero API costs, and robust fault tolerance.
