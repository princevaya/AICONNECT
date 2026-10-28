# AICONNECT: Architecture for 500k–1M Member Groups (#7)

## The Problem
Standard SQL databases use **Write Fan-out**: when a message is sent to a group, the server inserts a copy of that message into every member's inbox. For a 1M-member group, a single message would require 1,000,000 database writes. This will instantly crash the database and is financially impossible to scale.

## The Solution: Read Fan-out (Shared Timeline)
AICONNECT will implement **Read Fan-out** for supergroups (> 10,000 members).

1. **Write Path:** A message is written **once** to the `ChatMessage` table, linked to the `roomId`.
2. **Read Path:** When a user opens the group, they query `ChatMessage` where `roomId = X`, ordered by `createdAt DESC` with a `limit` (e.g., 50).
3. **Result:** Database writes remain constant (1 write per message), regardless of whether the group has 10 members or 1,000,000 members.

## Database Schema Changes (Implemented)
To support this, we must ensure specific indexes exist:
- `@@index([roomId, createdAt])` on `ChatMessage`: Allows instant pagination of messages without scanning the whole table.
- `@@index([roomId, userId])` on `ExternalChatRoomMember`: Allows instant checks of "does this user belong to this group?"
- `isSuperGroup: Boolean @default(false)` on `ExternalChatRoom`: Flags the room to bypass presence/typing indicators.

## Real-time Delivery (WebSockets)
For real-time messaging (LiveKit / WebSockets), iterating over 1M members to push a message is impossible.
- **Current Behavior:** Server loops over members and sends sockets. (Fails at scale).
- **Supergroup Behavior:** Server pushes the message to a Pub/Sub channel (e.g., Redis) named `room:${roomId}`. The WebSocket servers subscribe to channels for the rooms their connected users are in. 

## What is disabled for Supergroups?
- **Typing Indicators:** Turned off. Tracking typing for 1M people is an N-Squared problem.
- **Read Receipts (Blue ticks):** Turned off. Tracking 1M read states is too heavy. We switch to "Delivered" only.
