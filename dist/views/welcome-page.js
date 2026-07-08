"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWelcomePage = renderWelcomePage;
const env_1 = require("../config/env");
function renderWelcomePage() {
    const appName = env_1.env.appName;
    const appUrl = env_1.env.appUrl;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${appName} API</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
      color: #f8fafc;
      padding: 2rem;
    }
    .card {
      max-width: 32rem;
      width: 100%;
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 1rem;
      padding: 2.5rem;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      letter-spacing: -0.02em;
    }
    .tagline {
      color: #94a3b8;
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
    p {
      color: #cbd5e1;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }
    .links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      justify-content: center;
    }
    a {
      display: inline-block;
      padding: 0.625rem 1.25rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      transition: background 0.15s, color 0.15s;
    }
    a.primary {
      background: #3b82f6;
      color: #fff;
    }
    a.primary:hover { background: #2563eb; }
    a.secondary {
      background: rgba(148, 163, 184, 0.15);
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }
    a.secondary:hover { background: rgba(148, 163, 184, 0.25); }
    .status {
      margin-top: 1.5rem;
      font-size: 0.75rem;
      color: #64748b;
    }
    .dot {
      display: inline-block;
      width: 0.5rem;
      height: 0.5rem;
      background: #22c55e;
      border-radius: 50%;
      margin-right: 0.375rem;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to ${appName}</h1>
    <p class="tagline">Fair expense sharing API</p>
    <p>
      The backend is up and running. Use the REST API under <code>/api</code>
      to manage rooms, members, expenses, and more.
    </p>
    <div class="links">
      <a class="primary" href="${appUrl}">Open app</a>
      <a class="secondary" href="/api/health">Health check</a>
    </div>
    <p class="status"><span class="dot"></span>Server healthy</p>
  </div>
</body>
</html>`;
}
