# Real-Time Communication Strategy

**Resolves:** GAP-8 (real-time communication strategy)

---

## 1. Real-Time Communication Decision

### Option A: Server-Sent Events (SSE) — LOCKED
- Pros: Native browser support, simple, works with HTTP/2, auto-reconnect, Next.js API routes friendly
- Cons: Unidirectional (server→client only, but that's all we need for streaming), limited to ~6 connections per domain in HTTP/1.1
- Perfect fit: AI token streaming is server→client. Preview updates are response to POST. SSE is ideal.

### Option B: WebSockets
- Pros: Bidirectional, low latency
- Cons: More complex infrastructure, need WS server, harder to deploy behind CDN/proxies, overkill for our use case

### Option C: HTTP Polling
- Pros: Simplest to implement
- Cons: Latency, wasteful, terrible UX for real-time streaming

**Decision status:** LOCKED Option A (SSE).

---

## 2. SSE Architecture
- Endpoint: `GET /api/v1/drafts/:id/stream` — SSE connection for a draft
- Events: `ai_token` (streaming text), `field_update` (extracted field), `draft_status` (state change), `error`
- Connection: opened when user enters draft workspace, closed on leave
- Reconnect: browser auto-reconnects, resume from last event ID
- Frontend rule: one shared SSE connection per active draft. Multiple hooks may consume normalized events from a shared stream layer, but they must not open competing `EventSource` instances.

---

## 3. AI Streaming Flow
1. User sends message via POST `/api/v1/drafts/:id/messages`
2. Backend sends message to LLM provider
3. LLM provider streams tokens back
4. Backend pipes tokens through SSE as `ai_token` events
5. Frontend renders tokens into conversation panel + letter preview

---

## 4. Preview Update Strategy
- Preview does NOT re-render on every keystroke
- Preview updates on: AI draft completion, user field commit, zone edit save
- Preview re-render is triggered by backend event (not client-side)
- SSE event `draft_updated` signals frontend to fetch latest preview state

---

## 5. SSE Event Format

All SSE events follow this structure for reliable reconnection:

```
id: {monotonic-counter}
event: {event-type}
data: {JSON payload}

```

### Event types and payloads

| Event | Payload | When |
|-------|---------|------|
| `ai_token` | `{ "text": "partial text", "done": false }` | Each token from LLM stream |
| `ai_complete` | `{ "text": "full response", "done": true, "messageId": "uuid" }` | LLM response finished |
| `field_update` | `{ "field": "subject", "value": "Kündigung Mietvertrag" }` | Field extracted by AI |
| `draft_status` | `{ "status": "fields_complete" }` | DraftStatus state change |
| `draft_updated` | `{ "updatedAt": "ISO timestamp" }` | Draft content changed; frontend should refetch preview |
| `dispatch_status` | `{ "state": "accepted", "reference": "..." }` | DispatchState change |
| `error` | `{ "family": "provider_outage", "userMessage": "..." }` | Error during streaming |
| `keepalive` | (comment line `: keepalive`) | Heartbeat to prevent proxy timeout |

### Reconnection

The browser's `EventSource` auto-reconnects on disconnect. The `id` field enables resume:

```typescript
// Backend: track last event ID per connection
// On reconnect: client sends Last-Event-ID header
// Backend replays missed events since that ID (from in-memory buffer, max 100 events)
// If buffer exceeded: send a full-state event instead of replay
```

---

## 6. Fallback

- If SSE connection drops: browser `EventSource` auto-reconnects with `Last-Event-ID`
- If reconnection fails 3 times: fall back to polling `GET /api/v1/drafts/:id` every 5 seconds
- If AI streaming fails mid-response: send `error` event with `userMessage`; frontend shows partial text + "Try again" button
- If SSE is not supported (very rare — pre-2015 browsers only): detect with `typeof EventSource === 'undefined'`, fall back to polling

---

## 7. Connection Management

- Max 1 SSE connection per draft per client (enforce server-side: close previous connection for same session+draft)
- Heartbeat: send `:keepalive` comment every 30 seconds (prevents Nginx/CloudFlare proxy timeouts)
- Idle timeout: close connection after 10 minutes of no user-initiated activity; frontend can reconnect on next interaction
- Backpressure: if client cannot keep up (>50 buffered events), close connection and let client reconnect
- Connection counting: backend tracks active SSE connections in Redis (`sse:active:{sessionId}:{draftId}`)

---

## 8. Frontend Implementation Pattern

```typescript
// hooks/use-draft-stream.ts
export function useDraftStream(draftId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const source = new EventSource(`/api/v1/drafts/${draftId}/stream`, {
      withCredentials: true, // Send session cookie
    });

    source.onopen = () => setIsConnected(true);

    source.addEventListener('draft_updated', () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.draft(draftId) });
    });

    source.addEventListener('dispatch_status', (e) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dispatch(draftId) });
    });

    source.onerror = () => {
      setIsConnected(false);
      // EventSource auto-reconnects; track for fallback polling
    };

    return () => source.close();
  }, [draftId, queryClient]);

  return { isConnected };
}
```

This shared stream hook is the only place that opens the `EventSource`. Conversation, preview, and
dispatch-specific hooks consume its derived state rather than opening their own connections.
