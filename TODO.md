# TODO - Responsive refactor (mobile-first)

## Step 1 — Navigation & Sidebar
- [x] Inspect `components/navigation/*` + `components/dashboard/dashboard-layout-client.tsx`
- [ ] Implement mobile-first navbar + sidebar drawer (collapse sidebar into drawer on mobile)
- [ ] Remove overflow sources in navigation and layout wrappers

## Step 2 — Dashboard pages (page-by-page)
- [ ] Fix `app/dashboard/page.tsx` if needed (tabs container)
- [ ] Fix all views rendered by Dashboard:
  - [ ] overview-view
  - [ ] recording-view
  - [ ] schedule-view
  - [ ] interview-preview-view
  - [ ] external-chat-view
- [ ] Verify cards/tables/forms/dialogs/modals in these views across all required viewports

## Step 3 — Meeting pages (page-by-page)
- [ ] Fix `app/meeting/page.tsx`
- [ ] Fix `app/meeting/[code]/page.tsx`
- [ ] Fix `app/meeting/create/page.tsx`
- [ ] Fix `app/meeting/join/page.tsx`
- [ ] Fix all meeting components used by those routes:
  - [ ] meeting-room
  - [ ] participants-panel
  - [ ] pre-join-screen
  - [ ] vscode-editor
- [ ] Verify responsive behavior at all required viewports

## Step 4 — AI Interview
- [ ] Fix `app/dashboard/ai-interview/live/page.tsx` and all components it uses
- [ ] Fix `components/interview/*`
- [ ] Verify layouts, typography, images, buttons, and no overflow/clipping

## Step 5 — External Chat
- [ ] Fix `app/dashboard/external-chat/*` and `app/external-chat/*`
- [ ] Fix all components in `components/external-chat/*`
- [ ] Verify chat panels, modals, tabs, and call UIs

## Step 6 — Global UI primitives audit
- [ ] Audit dialogs/sheets/scroll-area/tabs/buttons/forms for responsive correctness
- [ ] Ensure no fixed widths, no clipped text, no overlapping elements
- [ ] Ensure tables only scroll horizontally when necessary

## Step 7 — Final project-wide verification
- [ ] Ensure no horizontal scrolling and no overflow across all pages
- [ ] Build + lint + run dev server smoke test
- [ ] Manual viewport checks at: 320, 360, 375, 390, 414, 768, 1024, 1280, 1440, 1920

