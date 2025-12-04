## Notes Collaboration WebSocket Schema

This document defines the events exchanged between clients and the Town service to support real‑time collaborative editing of notes.

### Conventions
- `roomId`: Identifier for the shared note space (e.g., NotesBoard interactable instance).
- `noteId`: Unique identifier for the note within the room.
- `userId`: Stable identifier for the connected participant.
- `version`: Monotonic integer version maintained by the server.
- Timestamps are ISO 8601 strings in UTC unless otherwise noted.
- Optional fields are marked as such; all others are required.

### Event Catalog

| Event | Direction | Payload | Description |
| --- | --- | --- | --- |
| `join_room` | client → server | `{ roomId, userId, noteVersion?, displayName? }` | Request to join a notes room. Optional `noteVersion` lets the server detect divergence; `displayName` is used in participant lists. |
| `room_state` | server → client | `{ roomId, noteId, content, version, participants: Participant[], lock? }` | Initial state after a successful join. |
| `leave_room` | client → server | `{ roomId, userId }` | Graceful disconnect; server broadcasts departure to remaining clients. |
| `participant_joined` | server → room | `{ roomId, userId, displayName, avatarColor?, timestamp }` | Notifies clients that a participant entered the room. |
| `participant_left` | server → room | `{ roomId, userId, timestamp }` | Notifies clients that a participant left the room. |
| `note_update` | client → server | `{ roomId, noteId, clientVersion, ops?[], content?, cursor?, selection? }` | Submits local edits. Prefer operational transforms (`ops`) when available; fall back to full `content`. Cursor data helps remote presence. |
| `note_ack` | server → client | `{ roomId, noteId, serverVersion }` | Acknowledges receipt of the client’s `note_update`, advancing the confirmed version. |
| `note_broadcast` | server → room | `{ roomId, noteId, serverVersion, ops?[], content?, editorId, cursor?, selection?, timestamp }` | Broadcasts canonical updates to all room participants, including the originator. |
| `conflict` | server → client | `{ roomId, noteId, serverVersion, yourVersion, mergedOps?[], mergedContent? }` | Indicates the client’s edit conflicted with a newer version. Client should reconcile using provided merged data or re-fetch state. |
| `cursor_update` | bidirectional | `{ roomId, noteId, userId, cursor, selection?, timestamp }` | Keeps remote caret/selection positions in sync. Can be throttled to reduce chatter. |
| `error` | server → client | `{ code, message, context? }` | Generic error wrapper for validation failures or unexpected exceptions. |
| `heartbeat` | bidirectional | `{ ts }` | Keeps idle connections alive; missing heartbeats trigger cleanup. |

```ts
type Participant = {
  userId: string;
  displayName: string;
  avatarColor?: string;
  joinedAt: string;
  lastSeenAt?: string;
};
```

### Expected Flows
1. **Join:** Client sends `join_room`, receives `room_state`, and begins receiving presence updates.
2. **Editing:** Client submits `note_update` for each change; waits for `note_ack` and listens for `note_broadcast` to update its document.
3. **Presence:** Clients stream `cursor_update` and receive `participant_joined` / `participant_left`.
4. **Conflict Handling:** If the server responds with `conflict`, the client should merge using provided data or re-request `room_state`.

### Error Handling Guidelines
- Use a consistent error `code` set (e.g., `ROOM_NOT_FOUND`, `VERSION_MISMATCH`, `UNAUTHORIZED`).
- Clients encountering repeated `conflict` errors should refetch `room_state`.
- Missing heartbeats should lead the server to emit `participant_left` and clean up locks.

This schema is intentionally extensible: new events should follow the same naming conventions and include versioning or capability negotiation if breaking changes are introduced.

