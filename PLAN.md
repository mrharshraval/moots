# Moots Project Roadmap & Implementation Plan

This document outlines the roadmap, active development checklist, and future expansion plans for the three main tiers of the Moots codebase: **REST API Backend**, **WebSocket Backend**, and **Next.js Frontend Client**.

---

## 1. Core Milestone Overview

```mermaid
gantt
    title Moots Roadmap & Development Milestones
    dateFormat  YYYY-MM-DD
    section Backend REST API (3002)
    Decouple Auth & Setup Express      :done,    des1, 2026-06-20, 2026-06-22
    Supabase DB Migration & pg Driver   :done,    des2, 2026-06-23, 2026-06-24
    Token Refresh & Session Revocation :active,  des3, 2026-06-25, 3d
    section WebSocket Backend (3001)
    Heartbeat and Graceful Reconnects :done,    ws1,  2026-06-21, 2026-06-23
    Redis-Backed Message Broker        :todo,    ws2,  after des3, 5d
    section Next.js Frontend Client (3000)
    NextAuth API Proxy Integration     :done,    fe1,  2026-06-22, 2026-06-23
    Chat UI Polish & Audio Cues        :active,  fe2,  2026-06-24, 2d
```

---

## 2. Component Development Plans

### A. REST API Backend (`backend/api`)

Focuses on user management, database persistence, and external service integrations.

*   **`[x]` Express Migration**: Transition authentication logic out of Next.js serverless functions to a standalone Node.js server.
*   **`[x]` Database Switch (SQLite -> Supabase)**: Move database state to hosted PostgreSQL on Supabase.
*   **`[x]` Native Driver Integration**: Implement PostgreSQL driver pool using `@prisma/adapter-pg` to avoid database connection exhaustion.
*   **`[/]` Security Auditing & JWT Rotation**:
    *   `[ ]` Configure rate-limiting middle-ware for `/api/auth/register` (e.g., maximum 5 signups per hour per IP).
    *   `[ ]` Implement secure HTTP-only cookie refreshment.
*   **`[ ]` Chat History API**:
    *   `[ ]` Design database models for storing messages, matching sessions, and attachment links.
    *   `[ ]` Expose paginated `/api/chat/history` endpoint for loading previous conversations.

---

### B. WebSocket Backend (`backend/realtime`)

Focuses on stateful real-time events, match matchmaking queues, and client connection registry.

*   **`[x]` Core Protocol**: Setup socket handshake, payload verification, and JSON-based event routing.
*   **`[x]` Health Management**: Implement heartbeat validation loop (20s interval) to prevent idle timeouts on platform proxies (e.g., Render, Nginx).
*   **`[x]` Reconnection Grace Period**: Create a 30s connection preservation buffer to allow matching users to reload pages without breaking session states.
*   **`[ ]` Multi-Node Scaling (Redis Integration)**:
    *   `[ ]` Set up Redis adapter to sync user matchmaking queue state across multiple WebSocket instances.
    *   `[ ]` Run Pub/Sub channels to route chat events between servers if paired peers reside on different hosts.
*   **`[ ]` Chat Monitoring & Metrics**:
    *   `[ ]` Implement Prometheus metrics endpoint (`/metrics`) tracking connected clients, active queues, and match latency.

---

### C. Frontend Client (`frontend/web`)

Focuses on highly responsive user interfaces, real-time message feeds, and state proxies.

*   **`[x]` Proxy Routing**: Forward frontend `/api/auth/*` requests cleanly to Express backend without direct database imports.
*   **`[x]` NextAuth Refactoring**: Migrate NextAuth to use Credentials login provider communicating via backend REST API.
*   **`[/]` User Interface Enhancements**:
    *   `[ ]` Add sound notifications on incoming messages and successful queue matches.
    *   `[ ]` Integrate visual typing status indicator bubbles in active chat feeds.
*   **`[ ]` PWA Configuration**:
    *   `[ ]` Set up service workers to support background push notifications for offline direct messages.

---

## 3. Deployment & DevOps Roadmap

*   **CI/CD Pipeline**:
    *   `[ ]` Configure GitHub Action checking lint rules and testing compilation across both frontend and backend directories on pull requests.
*   **Production Hosting**:
    *   **Frontend**: Next.js client deployed directly to Vercel.
    *   **REST API**: Express server containerized using Docker and deployed on Render.com Web Service tier.
    *   **WebSocket**: Run on Render.com behind Nginx configuration supporting socket connection upgrades.
