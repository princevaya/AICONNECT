# External Chat WhatsApp Refactor - TODO

## Part 1 — Status Modal Bug
- [x] Fix root cause: decouple Status tab selection from `openStatusViewer(0)`
- [ ] Verify modal never opens by default on desktop/mobile (runtime/manual)

## Part 2 — WhatsApp Style Navigation
- [ ] Desktop: add fixed left vertical rail (Chats, Status, Calls, You) and wire to `activeDesktopTabState`
- [ ] Desktop: ensure chat area occupies remaining width
- [ ] Mobile: ensure bottom nav fixed and never overlaps composer / send button

## Part 3 — WhatsApp Style Status System
- [ ] Replace status feed area to show only:
  - My Status
  - Recent Updates
  - Viewed Updates
  (no automatic story viewer on entry)
- [ ] Ensure story open triggers viewer + view tracking (insert into `external_chat_status_views`) only when viewer actually opens

## Part 4 — Calls Tab Restructure
- [ ] Calls tab UI: Recent / Missed / Incoming / Outgoing / Group based on actual `external_chat_call_sessions` feed from API

## Part 5 — Chats Tab Restructure
- [ ] Chats tab default landing
- [ ] Chats list shows DM/Groups/Last message/Unread count/Timestamp using existing schema-backed data

## Part 6 — Profile / You Tab
- [ ] Implement You tab content using existing profile settings UI
