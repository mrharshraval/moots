# Moots Platform — Principal Engineer Architecture Review (v2)
> **Scope**: `backend/api`, `backend/realtime`, `packages/contracts`
> **Standard**: Enterprise-grade distributed systems engineering
> **Date**: 2026-06-28 · Revised post peer-review

---

## Executive Summary

The Moots platform has undergone significant foundational progress since the original audit in `implementation_plan.md`. JWT authentication is live end-to-end, the Actor model is partially implemented in the schema, the Policy Engine exists with capability-based presets, and the realtime service has been migrated to TypeScript with pino and prom-client.

However, the most critical structural gap remains: **the two services are not connected through a reliable event pipeline.** No Redis, no Outbox, no domain events. All business logic in the realtime service that touches durable state (connections, identity reveals, read receipts) still bypasses the API entirely. The messages domain is a stub. The platform is in Phase 1.5 of a 7-phase roadmap.

This revision incorporates peer-review feedback to:
- Elevate the **Outbox pattern** to first-class status in Phase 3
- Define **Aggregate Root ownership** explicitly  
- Expand the **`packages/contracts` vision** as the canonical platform contract
- Mark **internal HTTP** as a transitional bridge, not an end-state
- Add a **database evolution** review
- Name every **ADR** rather than deferring them
- Add a **long-term platform evolution roadmap**

---

## Scorecard

| Dimension | Score | Rationale |
|---|---|---|
| **Overall Architecture** | **4.5 / 10** | Strong schema & policy layer; fundamentally incomplete integration layer |
| **API Architecture** | **5.5 / 10** | Good domain structure, DI container, pino, auth middleware; but actorId/userId mismatch and no refresh tokens |
| **Realtime Architecture** | **3.5 / 10** | JWT, TypeScript, metrics — good; still in-memory only, RT-08 still live |
| **Database Architecture** | **5.5 / 10** | Advanced schema; but `isGuest` ghost column, UUID/CUID inconsistency, no Outbox table, no audit tables |
| **Security Score** | **5.0 / 10** | JWT exists; rate limiting exists; but no refresh tokens, origin check prod-only |
| **Scalability Score** | **2.5 / 10** | No Redis = single realtime node cap; no shared state |
| **Maintainability Score** | **6.0 / 10** | Clean folder structure; partial DI; `any` types present; zero tests |
| **Privacy Architecture** | **7.0 / 10** | Actor model, identity state machine, MessageSerializer, and policy presets are best-in-class for this stage |
| **Developer Experience** | **4.5 / 10** | Good conventions; no tests; no CI; PLAN.md stale |

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Completed |
| 🟡 | Partially completed |
| ❌ | Missing |
| ⚠️ | Architectural issue or regression |
| 🔄 | Recommendation: implementation plan change |
| 💡 | New architectural recommendation |

---

## Part I — What Changed Since the Original Audit

### ✅ Completed

- **RT-01**: JWT verification on WS handshake — `verifyToken` from `@moots/contracts`, query param `?token=`
- **RT-04**: Realtime fully migrated to TypeScript
- **RT-05**: Message IDs use `crypto.randomUUID()`
- **RT-06**: Timestamps use `new Date().toISOString()`
- **RT-09**: Zod aligned to `^4.4.3` across both services
- **RT-16**: `userToIds` reverse index in `ConnectionRegistry`
- **RT-20**: `structuredLog` extracted from `messaging.ts` → `lib/logger.ts`
- **P1.1**: JWT middleware (`authenticate.middleware.ts`) with `req.user` augmentation
- **P1.3**: CORS whitelist via `env.ALLOWED_ORIGINS`
- **P1.4**: Rate limiting (`authRateLimiter`, `readRateLimiter`) on all routes
- **P1.5**: OTP uses `crypto.randomInt()` — CSPRNG
- **P1.6**: Multi-step writes wrapped in `prisma.$transaction()`
- **P2.1**: pino logger in API
- **P2.4**: `BaseRepository` + `TransactionClient` abstraction
- **P2.6–P2.9**: Realtime TypeScript, Zod v4, pino, prom-client metrics
- **P2.12**: Reverse index in `ConnectionRegistry`
- **P3.3**: Policy domain, `Capability` enum, `PolicyService.assertCapability()`, 4 presets
- **P3.4 partial**: `MessageSerializer` + `IdentityState` enum in schema
- **P3.5a–c partial**: `GuestSession`, `Actor`, `ActorType` in schema; guest login and promotion in `AuthService`
- **Schema**: `Participant.actorId`, `Participant.persona`, `Participant.identityState`, `Conversation.policyId`, `Message.senderParticipantId`, `Message.deletedAt`
- **P2.8 partial**: `packages/contracts` bootstrapped with `TokenClaims`
- **Conversation Retrieval**: `findConversationSummaries` with cursor pagination, `lastMessagePreview/lastActivityAt` denormalized on `Conversation`

### 🟡 Partially Completed

- **P2.3**: DI container covers Auth only; conversations/connections use `new X()` inline
- **P3.5**: Actor model in schema; `resolveIdentity` chain not wired into message fetch
- **P3.6**: No `EventBus`, no Redis publisher, no domain events
- **packages/contracts**: `TokenClaims` only — no WS events, no platform event envelopes

---

## Part II — Critical Issues (Still Open)

### ⚠️ CRIT-01 · No Refresh Tokens

`jwtService.signRefresh()` exists but is never called. Access tokens expire in 15 minutes with no renewal path. Every user is forcibly logged out after 15 minutes. Any active WebSocket connection cannot renew its token without fully reconnecting.

**Fix**:
- `POST /api/auth/refresh` — HTTP-only cookie, issues new access token
- Store refresh tokens in `Session` table with revocation
- WS client re-authenticates before reconnecting

**Priority**: P0 — UX blocker today.

---

### ⚠️ CRIT-02 · RT-08 Still Live — Durable State Mutations in Realtime

`messaging.ts:344–369` still forwards `connection:request`, `connection:accepted`, `connection:removed`, `participant:identity-revealed`, and `participant:identity-hidden` as raw relay events with no validation, no policy check, and no persistence.

```typescript
case "connection:request":
case "connection:accepted":
case "connection:removed":
case "participant:identity-revealed":
case "participant:identity-hidden": {
  partnerConn.ws.send(JSON.stringify({ type, payload })); // No validation. No DB write.
  break;
}
```

> **Service Boundary Rule**: Realtime owns **ephemeral state** — presence, typing, delivery ACKs, session grace timers, matchmaking queue. API owns **durable state** — connections, identity transitions, read counts, message persistence. Any event that mutates a Postgres row must flow through the API, not through Realtime.

These events must become API calls (HTTP or Redis command queue, see Phase 3). This is not a policy preference — it is a data integrity requirement.

**Priority**: P0 — privacy violation and data integrity failure.

---

### ⚠️ CRIT-03 · Messages Domain Is a Stub

The `messages` domain has `MessageSerializer` and `message.types.ts` only. No controller, no route, no service for `POST /api/messages`. No `messagesRouter` in `app.ts`. All messages live in `session.messages[]` in realtime process memory.

**Priority**: P0.

---

### ⚠️ CRIT-04 · API ↔ Realtime Completely Disconnected

No Redis. No domain events. No shared state. One realtime instance maximum. Matchmaking queue lost on restart.

**Priority**: P0.

---

### ⚠️ CRIT-05 · Active Bug — `actorId`/`userId` Mismatch in Conversations

`conversations.service.ts` passes `userId` to `updateParticipantSettings` (which uses `actorId_conversationId` unique key) and finds participants by `p.userId` (which doesn't exist on `Participant` — it has `actorId`). Every authenticated conversation API call silently returns wrong data.

**Priority**: P0 — active bug.

---

### ⚠️ CRIT-06 · `Connection` Model Still `User`-to-`User`

`Connection` references `user1Id/user2Id → User`, not `actorId → Actor`. Guest users cannot form connections. Actor abstraction is incomplete.

**Priority**: P1.

---

### ⚠️ CRIT-07 · `User.isGuest` Ghost Column

`User.isGuest Boolean @default(false)` still exists alongside `Actor.type`. Two sources of truth. All checks must migrate to `Actor.type`.

**Priority**: P1.

---

### ⚠️ CRIT-08 · `join-chat` Has No Ownership Verification

`session.ts` now throws if session doesn't exist (on-demand creation removed ✅). But any authenticated user who knows a `sessionId` can still call `join-chat` and inject themselves as a participant — there is no check that the authenticated `actorId` is in `session.users[]`.

**Priority**: P1.

---

### ⚠️ CRIT-09 · Origin Check Still Prod-Only

```typescript
if (env.NODE_ENV === "production") { // still there
```

**Priority**: P1 — was flagged as P2 in original plan, remains unfixed.

---

## Part III — Aggregate Root Ownership

Defining aggregate boundaries prevents a large class of future bugs — cross-boundary queries, leaked invariants, and repository responsibility creep.

```
Conversation  ─── owns ───▶  Participant
                                   │
                                   ├──── owns ────▶  Persona (JSON → future entity)
                                   └──── owns ────▶  IdentityState (state machine)

Conversation  ─── owns ───▶  Message
                                   └──── references ──▶  Participant (by senderParticipantId)

Actor  ────────── owns ───▶  GuestSession (GUEST type only)
Actor  ────────── owns ───▶  Device (future)
Actor  ────────── owns ───▶  Authentication (via Session table)

Connection  ───── owns ───▶  ConnectionRequest (implicit via status FSM)
```

**Enforcement rules**:
- Repositories may only persist their own aggregate root and its owned children
- `MessageRepository` may not write to `Participant` — that goes through `ParticipantRepository`
- `ConversationRepository` may not query `Actor` directly — it resolves through `Participant`
- No cross-aggregate FK traversal in a single repository method (use separate lookups and compose in the service layer)

---

## Part IV — Service Responsibility Boundary (Authoritative)

> **The fundamental rule**: Realtime owns **ephemeral state**. API owns **durable state**. No exceptions.

| Responsibility | Owner | Rationale |
|---|---|---|
| Authentication (issue JWT) | API | Persists to `Session` |
| JWT verification | Both | Realtime verifies; API issues |
| Actor/Guest session creation | API | Persists to DB |
| Connection request / acceptance | API | Persists to `Connection` table |
| Conversation creation | API | Persists to `Conversation` table |
| Message persistence | API | Persists to `Message` table |
| Identity state machine | API | Persists `Participant.identityState` |
| Policy enforcement | API | `PolicyService.assertCapability()` |
| Presence (online/offline) | Realtime | Ephemeral; `lastSeenAt` update via API event |
| Typing indicators | Realtime | Ephemeral, never persisted |
| Delivery ACKs | Realtime | Ephemeral per-connection |
| Matchmaking queue | Realtime | Ephemeral → Redis sorted set for scale |
| Room management | Realtime | `conversationId → Set<connectionId>` |
| Reconnection grace timers | Realtime | Ephemeral → Redis TTL for scale |
| Heartbeats | Realtime | Per-connection |
| WS event routing | Realtime | Delivery only |

---

## Part V — Platform Event Pipeline (Target Architecture)

### Why Outbox First

Directly publishing to Redis after a DB write is not safe. If the process crashes between the write and the publish, the event is lost silently. The Outbox pattern makes event delivery **transactionally guaranteed**.

```
Client Request
     │
     ▼
API (business logic)
     │
     ▼
 ┌─────────────────────────────────────────┐
 │  Single Prisma Transaction              │
 │   ├── Write to domain table (Message,   │
 │   │   Connection, Participant, etc.)    │
 │   └── Write to OutboxEvent table        │
 └─────────────────────────────────────────┘
     │
     ▼
Outbox Worker (polling or trigger)
     │
     ▼
Redis Pub/Sub  (moots:event:*)
     │
     ▼
Realtime Service (subscriber)
     │
     ▼
Connected WS Clients (room broadcast)
```

### Redis Command Queue (for Realtime → API mutations)

When a realtime event must trigger a durable write, Realtime enqueues a command to Redis. The API's worker consumes it, persists, and publishes the result event. **No HTTP call from Realtime to API ever.**

```
Realtime receives "send-message" from client
     │
     ▼
Redis Command Queue  (moots:command:send_message)
     │
     ▼
API Worker consumes command
     │
     ▼
 ┌──────────────────────────────────┐
 │  Transaction                     │
 │   ├── Insert Message             │
 │   ├── Update Conversation.last*  │
 │   └── Insert OutboxEvent         │
 └──────────────────────────────────┘
     │
     ▼
Outbox Worker → Redis → Realtime → Clients
```

> **Note on transitional internal HTTP**: During Phase 2, while Redis is not yet wired, Realtime may call `POST /internal/v1/messages` secured by `X-Internal-Service-Key`. This is **a temporary bridge only** — it must be removed when Phase 3 lands. Do not build new features on top of internal HTTP.

### Redis Channel Naming Convention

```
moots:event:message.sent
moots:event:message.edited
moots:event:message.deleted
moots:event:reaction.updated
moots:event:conversation.created
moots:event:participant.typing        # ephemeral — no Outbox needed
moots:event:participant.read
moots:event:identity.reveal_initiated
moots:event:identity.reveal_confirmed
moots:event:connection.requested
moots:event:connection.accepted
moots:event:presence.online           # ephemeral
moots:event:presence.offline          # ephemeral
moots:event:matchmaking.matched

moots:command:send_message
moots:command:edit_message
moots:command:send_reaction
moots:command:mark_read
moots:command:connection_request
moots:command:connection_accept
moots:command:identity_reveal
```

### Platform Event Envelope

```typescript
// packages/contracts/src/events.ts
interface PlatformEvent<T> {
  eventId:        string;     // CUID2 — for deduplication
  eventType:      string;     // 'message.sent'
  version:        number;     // schema version
  occurredAt:     string;     // ISO-8601
  correlationId:  string;     // requestId for end-to-end tracing
  conversationId?: string;    // room routing hint for Realtime
  actorId?:       string;     // target actor for direct delivery
  payload:        T;
}
```

---

## Part VI — `packages/contracts` Vision

Currently `packages/contracts` contains only `TokenClaims`. This package should become the **canonical platform language** — the single source of truth for every contract between services and between the platform and clients.

### Target Structure (built domain-by-domain as domains mature)

```
packages/contracts/src/
├── auth/
│   ├── token-claims.ts        # TokenClaims (exists)
│   └── refresh-request.ts
├── actors/
│   └── actor.types.ts
├── capabilities/
│   └── capability.enum.ts     # Capability enum (move from API)
├── connections/
│   └── connection.events.ts
├── conversations/
│   └── conversation.events.ts
├── events/
│   ├── platform-event.ts      # PlatformEvent<T> envelope
│   └── outbox-event.ts
├── errors/
│   └── error-codes.ts         # Canonical error codes (shared)
├── identity/
│   └── identity-state.ts      # IdentityState enum (move from Prisma)
├── messages/
│   └── message.events.ts
├── participants/
│   └── participant.events.ts
├── personas/
│   └── persona.types.ts
├── policies/
│   └── policy.types.ts        # ConversationPolicy interface (move from API)
├── presence/
│   └── presence.events.ts
└── websocket/
    ├── client-to-server.ts    # Inbound WS event map
    └── server-to-client.ts    # Outbound WS event map
```

> **Implementation note**: Do not create all directories now. Create each subdirectory when the corresponding domain is being built. Premature structure is dead weight.

---

## Part VII — Database Evolution Review

### Current State Findings

| Item | Finding | Action |
|---|---|---|
| `User.isGuest` | Ghost column — two sources of truth alongside `Actor.type` | Remove; migrate to `Actor.type` |
| `Message.clientMessageId` uses `@default(uuid())` | Inconsistent — all other IDs use CUID (`@default(cuid())`) | Align to CUID or justify the divergence |
| `Connection` references `User`, not `Actor` | Incomplete Actor abstraction | Migrate to `actor1Id/actor2Id` |
| Cascade rules | `onDelete: Cascade` on critical paths is correct; verify `Message` → `Participant` cascade is intentional (should be soft-delete) | Switch Message FK to `SetNull` + soft delete |
| Soft delete | `Message.deletedAt` exists ✅; `Conversation` uses `status: DELETED` not `deletedAt` | Standardize: all soft deletes use `deletedAt` timestamp |
| Outbox table | Missing | Add `DomainEvent` outbox table in Phase 3 |
| Audit tables | Missing | Add `AuditLog` for auth events, capability denials, WS auth failures |
| Partial indexes | None present | Add `WHERE deletedAt IS NULL` partial indexes on `Message` |
| `@@index([lastActivityAt])` | ✅ Present on `Conversation` | - |
| `@@index([conversationId, createdAt])` | ✅ Present on `Message` | - |
| `@@unique([actorId, conversationId])` | ✅ Present on `Participant` | - |

### Required Schema Additions (Phase 3)

```prisma
model DomainEvent {
  id             String   @id @default(cuid())
  eventType      String
  aggregateId    String
  aggregateType  String
  payload        Json
  publishedAt    DateTime?
  occurredAt     DateTime @default(now())

  @@index([publishedAt])   // outbox worker queries unpublished
  @@index([occurredAt])
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?
  event      String   // 'AUTH_SUCCESS', 'AUTH_FAILURE', 'CAPABILITY_DENIED'
  metadata   Json
  ip         String?
  occurredAt DateTime @default(now())

  @@index([actorId])
  @@index([occurredAt])
}
```

---

## Part VIII — Domain Ownership Audit

### API Domain Status

| Domain | Routes | Controller | Service | Repository | Auth | Issues |
|---|---|---|---|---|---|---|
| `auth` | ✅ | ✅ | ✅ | ✅ | N/A | No refresh endpoint |
| `users` | ✅ | ✅ | ✅ | ✅ | ✅ | - |
| `conversations` | ✅ | ✅ | ✅ | ✅ | ✅ | CRIT-05: `actorId`/`userId` mismatch |
| `connections` | ✅ | ✅ | ✅ | ✅ | ✅ | CRIT-06: `userId` not `actorId` |
| `messages` | ❌ | ❌ | Stub | Stub | N/A | CRIT-03 |
| `policy` | Service only | ❌ | ✅ | Stub | N/A | Correct for internal-only |

### Realtime Service Status

| Responsibility | Status | Classification | Issues |
|---|---|---|---|
| JWT Handshake Auth | ✅ | Security | `any` cast on decoded user |
| Connection Registry | ✅ | Ephemeral | - |
| Matchmaking | ✅ in-memory | Ephemeral | Cannot scale beyond 1 node |
| Message Delivery | 🟡 | Durable | Messages in-memory only — CRIT-03 |
| Identity Reveal | ⚠️ | **Durable** | Forwarded raw — CRIT-02 |
| Connection Events | ⚠️ | **Durable** | Forwarded raw — CRIT-02 |
| Typing Status | ✅ | Ephemeral | Correct boundary |
| Read Receipts | 🟡 | Durable | In-memory only |
| Heartbeat | ✅ | Ephemeral | - |
| Graceful Shutdown | ✅ | Ops | - |
| Metrics | ✅ | Ops | prom-client |
| Redis Pub/Sub | ❌ | Infrastructure | CRIT-04 |
| Per-connection Rate Limiting | ❌ | Security | RT-17 |

### `packages/contracts` Status

| Item | Status |
|---|---|
| `TokenClaims` | ✅ |
| Platform event envelope | ❌ |
| WS client→server event map | ❌ |
| WS server→client event map | ❌ |
| Capability enum | ❌ (lives in API only) |
| Shared error codes | ❌ |

---

## Part IX — Codebase Smell Catalogue

### API

| ID | Location | Issue |
|---|---|---|
| S-01 | `conversations.service.ts:18` | `.find(p => p.userId === userId)` — `userId` doesn't exist on `Participant` |
| S-02 | `conversations.service.ts:48` | Passes `userId` to `updateParticipantSettings`; should be `actorId` |
| S-03 | `conversations.repository.ts:7` | `COUNT` + `findMany` double-query; replace with single `findMany` + empty-check |
| S-04 | `container.ts` | DI only covers Auth; all other domains `new X()` inline |
| S-05 | `auth.service.ts:133` | JWT embeds `userId` + `email` + `actorId`; should be `actorId` only |
| S-06 | `jwt.service.ts:12` | 15m access token with no refresh path |
| S-07 | `schema.prisma:88` | `User.isGuest` ghost column |
| S-08 | `policy-engine.service.ts:38` | `Object.values(POLICIES)` O(n) scan; use `Map` keyed by `policyId` |
| S-09 | `conversations.service.ts` | `new ConversationsRepository()` bypasses DI container |
| S-10 | `messaging.ts:18` | `console.error` used directly — RT-11 not fully fixed |

### Realtime

| ID | Location | Issue |
|---|---|---|
| S-11 | `server.ts:92` | `(decodedUser as any).userId \|\| decodedUser.actorId` — leaky `any`; `TokenClaims` should be authoritative |
| S-12 | `types.ts` | All payload schemas accept `userId` from client; should be stripped — actorId comes from registry only |
| S-13 | `messaging.ts:57` | Variable `userId` actually holds `actorId`; rename to avoid confusion |
| S-14 | `session.ts:11` | `messages: any[]` — untyped |
| S-15 | `session.ts:103–130` | `handleDisconnect` is O(sessions × connections); add `connectionId → sessionId` reverse map |

---

## Part X — Long-Term Architecture Assessment

| Capability | Today | Blocker |
|---|---|---|
| Millions of concurrent users | ❌ | No Redis, single realtime node |
| Horizontal scaling | ❌ | In-memory state |
| Multiple realtime nodes | ❌ | No shared state |
| Multiple API nodes | ✅ | Stateless + Prisma pool |
| AI participants | 🟡 | `ActorType.AI` in schema; no impl |
| Voice / Video | ❌ | WebRTC signaling not present |
| Push notifications | ❌ | No `Device` model |
| Mobile clients | 🟡 | JWT works; no push token |
| Multiple devices | ❌ | No `Device` entity |
| Feature flags | ❌ | Not present |
| Zero-downtime deploys | 🟡 | API yes; realtime loses in-memory state on deploy |
| Event sourcing readiness | ❌ | No EventBus, no Outbox |
| CQRS readiness | 🟡 | Schema supports it; no read/write split |
| Outbox pattern | ❌ | Not present |
| Moderation | ❌ | No domain |
| Organizations / Communities | ❌ | No domain |
| Search | ❌ | No domain |

---

## Part XI — Updated Implementation Roadmap

### Phase 1 · Security Hardening — IMMEDIATE

| ID | Task | Priority |
|---|---|---|
| 1.1 | `POST /api/auth/refresh` + HTTP-only cookie | **P0** |
| 1.2 | Store refresh tokens in `Session` table; issue on login | **P0** |
| 1.3 | Fix `conversations.service.ts` to use `actorId` not `userId` | **P0** |
| 1.4 | Origin check active in all environments; add localhost to `ALLOWED_ORIGINS` | **P1** |
| 1.5 | Strip `userId` from all WS payload schemas; use `conn.userId` from registry | **P1** |
| 1.6 | Verify authenticated `actorId` is in `session.users[]` before `join-chat` | **P1** |
| 1.7 | Remove `User.isGuest`; migrate all checks to `Actor.type` | **P1** |
| 1.8 | Align `Message.clientMessageId` to CUID | **P2** |

### Phase 2 · Messages Domain + Transitional Persistence Bridge

> Build the messages domain alongside a **temporary internal HTTP bridge**. This gives you working message persistence immediately while Phase 3 builds the async pipeline that replaces the bridge.

| ID | Task | Priority |
|---|---|---|
| 2.1 | `messages.repository.ts` — `create`, `findByCursor`, `softDelete` | **P0** |
| 2.2 | `messages.service.ts` — persist, update `Conversation.last*` | **P0** |
| 2.3 | `POST /internal/v1/messages` secured by `X-Internal-Service-Key` | **P0** |
| 2.4 | `GET /api/conversations/:id/messages` — cursor-paginated history | **P1** |
| 2.5 | Realtime `send-message` → `POST /internal/v1/messages` (transitional) | **P0** |
| 2.6 | Realtime `connection:request/accepted` → `POST /internal/v1/connections` | **P0** |
| 2.7 | Realtime `participant:identity-revealed` → `POST /internal/v1/conversations/:id/reveal` | **P0** |
| 2.8 | Realtime `edit-message`, `send-reaction`, `read-messages` → internal endpoints | **P1** |
| 2.9 | Register all domain services in Awilix container | **P1** |

### Phase 3 · Redis + Outbox + Async Pipeline (Replaces HTTP Bridge)

> This phase makes the platform horizontally scalable and removes all internal HTTP calls.

| ID | Task | Priority |
|---|---|---|
| 3.1 | `ioredis` client in both API and Realtime | **P0** |
| 3.2 | `DomainEvent` Outbox table in Prisma schema | **P0** |
| 3.3 | API wraps all mutations in `[DB write + OutboxEvent]` transaction | **P0** |
| 3.4 | Outbox worker: polls unpublished events → publishes to Redis | **P0** |
| 3.5 | Realtime subscribes to `moots:event:*` → routes to room members | **P0** |
| 3.6 | Redis Command Queue: Realtime enqueues commands; API worker persists | **P0** |
| 3.7 | Remove all `POST /internal/v1/*` HTTP calls from Realtime | **P0** |
| 3.8 | `packages/contracts`: platform event envelope + WS event maps | **P1** |
| 3.9 | Move matchmaking queue to Redis sorted set | **P1** |
| 3.10 | Move session grace period timers to Redis `EXPIRE` | **P1** |
| 3.11 | Per-connection rate limiting (token bucket, 60 msg/min) | **P1** |
| 3.12 | `AuditLog` table — auth events, capability denials, WS auth failures | **P1** |

### Phase 4 · Actor Completeness + Identity

| ID | Task | Priority |
|---|---|---|
| 4.1 | Migrate `Connection` to `actor1Id/actor2Id` | **P1** |
| 4.2 | `resolveIdentity` fully implemented and called in message fetch | **P1** |
| 4.3 | `Persona` promoted from JSON field to concrete entity | **P1** |
| 4.4 | `Device` model — `actorId, deviceId, platform, pushToken` | **P2** |
| 4.5 | Data-driven policies — `Policy` Prisma model; `Conversation.policyId` FK | **P2** |

### Phase 5 · Testing + Developer Experience

| ID | Task | Priority |
|---|---|---|
| 5.1 | Vitest + supertest integration tests for all routes | **P1** |
| 5.2 | Unit tests — `PolicyService`, `MessageSerializer`, `MatchmakingService` | **P1** |
| 5.3 | CI pipeline: lint → typecheck → test → coverage → build | **P1** |
| 5.4 | OpenAPI spec generated from Zod schemas | **P2** |
| 5.5 | Retire `PLAN.md`; `implementation_plan.md` is the single planning source | **P2** |

### Phase 6 · Observability + Production Ops

| ID | Task | Priority |
|---|---|---|
| 6.1 | OpenTelemetry auto-instrumentation — shared `correlationId` across services | **P2** |
| 6.2 | Sentry error tracking | **P2** |
| 6.3 | BullMQ — email, guest cleanup, Outbox retry, `lastActivityAt` sync | **P2** |
| 6.4 | Secrets rotation policy (Doppler or platform-native) | **P2** |

### Phase 7 · Platform Governance

| ID | ADR | Purpose |
|---|---|---|
| ADR-01 | Actor Model | Why Actor abstracts User, Guest, Bot — not User subclasses |
| ADR-02 | Anonymous Identity by Default | Why `ANONYMOUS` is the default `IdentityState` |
| ADR-03 | Participant Ownership | Why Message references Participant not Actor or User |
| ADR-04 | API vs Realtime Boundary | Ephemeral = Realtime, durable = API; no exceptions |
| ADR-05 | Redis Communication | Outbox + command queue over direct publish or internal HTTP |
| ADR-06 | Policy Engine | Capability-based authorization over role-based |
| ADR-07 | Outbox Pattern | Why every DB write + event publish must be transactional |
| ADR-08 | Message Lifecycle | Soft delete strategy; `senderParticipantId` as sole sender reference |
| ADR-09 | Persona System | Ephemeral persona during anonymity; revealed profile after mutual consent |
| ADR-10 | Connection Model | Why Connection references Actor not User; participant-scoped connections |

---

## Part XII — Platform Evolution Roadmap

```
Current (Phase 1)
     │  JWT auth, Actor model, Policy engine, cursor pagination
     ▼
Phase 2–3 (Near Term)
     │  Message persistence, Redis, Outbox, async command pipeline
     ▼
Phase 4 (Identity Complete)
     │  Actor completeness, Device model, data-driven policies, Persona entity
     ▼
Phase 5–6 (Production Ready)
     │  Full test coverage, CI/CD, observability, BullMQ jobs
     ▼
v1.0 — Horizontally scalable, production-secure, fully event-driven platform
     │
     ▼
Modular Monolith → Extract Bounded Contexts
     │  Presence domain, Matchmaking domain, Moderation domain
     ▼
Event-Driven Platform
     │  All mutations produce domain events; full audit log
     ▼
CQRS Readiness
     │  Read replicas for conversation/message history; write DB for mutations
     ▼
Event Sourcing Readiness
     │  DomainEvent table as append-only ledger; state rebuilt from events
     ▼
Global Multi-Region
     │  Multi-region Postgres (read replicas per region); Redis Cluster
     │  Realtime nodes per region; matchmaking scoped by region
     ▼
Platform Extensions
     │  AI Participants (ActorType.AI) 
     │  Voice/Video (WebRTC signaling gateway)
     │  Push Notifications (Device model + APNs/FCM)
     │  Communities and Organizations
     │  Plugins and SDK
     │  Multi-platform clients (iOS, Android, Web)
```

---

## Part XIII — Additional Architectural Recommendations

### 💡 REC-01 · Keep JWT Lean — `actorId` Only

Sign tokens with `{ actorId }` only. Remove `userId` and `email` from the payload — they couple the token to the User entity. All resolution happens server-side.

### 💡 REC-02 · Replace `COUNT` + `findMany` with Single Query

```typescript
const conversations = await prisma.conversation.findMany({ where: { ... }, take: limit + 1, ... });
if (conversations.length === 0) return { items: [], nextCursor: null };
```

One DB round trip instead of two.

### 💡 REC-03 · Standardize Soft Delete

`Message` uses `deletedAt`; `Conversation` uses `status: DELETED`. Pick one strategy and apply it consistently. Recommended: `deletedAt DateTime?` on all soft-deleted entities, with partial indexes `WHERE deletedAt IS NULL`.

### 💡 REC-04 · Policy Engine → Data-Driven

Move `POLICIES` from code constants to a `Policy` Prisma model. `Conversation.policyId` becomes a proper FK. This enables per-conversation policy customization without code deploys.

### 💡 REC-05 · `handleDisconnect` Reverse Index

Add `connectionId → sessionId` reverse map in `SessionService` (parallel to what `ConnectionRegistry` already does). Eliminates the O(sessions × connections) linear scan on every disconnect.

### 💡 REC-06 · Remove `any` with Prisma Inference

Replace `(conv: any)` and `(p: any)` in `conversations.service.ts` with `Prisma.ConversationGetPayload<{ select: typeof yourSelect }>`. This would have caught CRIT-05 at compile time.

---

## Summary of Action Items by Priority

| Priority | Count | Key Items |
|---|---|---|
| **P0** | 8 | Refresh tokens, `actorId`/`userId` bug, message persistence, RT-08, Redis + Outbox |
| **P1** | 14 | Origin check, `userId` stripping from WS payloads, session ownership, actor Connection, rate limiting, CI, ADRs |
| **P2** | 10 | DI container, tests, OpenAPI, observability, Device model, data-driven policies |
| **P3** | 5 | JWT lean, Platform evolution docs, PLAN.md retirement |
