# External Chat WhatsApp Refactor - Implementation Tracker

> Tracks completion against the approved multi-phase plan.

## Phase A — Navigation + Layout correctness (Desktop/Mobile)
- [x] Update `MobileBottomNav` to include **Status** tab and **You** tab per requirements.
- [x] Update mobile nav state typing and handlers to support `status` tab.
- [ ] Update desktop left rail to include **Status** (no overlap; widths within constraints).
- [ ] Refactor mobile navigation + composer positioning to ensure input never gets covered.
- [ ] Fix/verify Status should never auto-open.


## Phase B — WhatsApp Status system (UI + realtime wiring)
- [ ] Implement status feed ordering: My Status, Recent Updates, Viewed Updates.
- [ ] Implement status viewer UI (progress, tap left/right, auto-advance).
- [ ] Implement `external_chat_status_views` recording (exactly once per viewer/status).
- [ ] Add realtime updates for status uploads/views/reactions/comments.
- [ ] Ensure Status accessible only via Status tab.

## Phase C — Message states + typing + presence (realtime)
- [ ] Implement sent/delivered/seen semantics using existing schema.
- [ ] Implement realtime typing indicators.
- [ ] Implement realtime presence (online/offline/last seen).

## Phase D — Performance
- [ ] Add message virtualization.
- [ ] Ensure pagination + infinite scroll works with virtualization.
- [ ] Ensure EventSource subscriptions cleanup (no duplication).

## Phase E — Verification
- [ ] Desktop screenshots checklist completed.
- [ ] Mobile screenshots checklist completed.
- [ ] Realtime cleanup tests completed.

