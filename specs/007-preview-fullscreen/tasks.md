# Tasks: Preview Fullscreen Mode

**Input**: Design documents from `/specs/007-preview-fullscreen/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tests**: No automated tests requested (Manual testing specified in plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

- **Monorepo structure**:
  - `packages/app/src/` - Main application UI
  - `packages/ui/src/` - Reusable UI components
- Key files:
  - `packages/app/src/context/layout.tsx` - Layout state management
  - `packages/app/src/components/file-preview-panel.tsx` - Preview panel component

---

## Phase 1: Setup

**Purpose**: Verify prerequisites and existing infrastructure

- [x] T001 Verify `expand` icon exists in packages/ui/src/components/icon.tsx
- [x] T002 Review existing filePreview state structure in packages/app/src/context/layout.tsx

---

## Phase 2: Foundational

**Purpose**: Add fullscreen state management to layout context (required for both user stories)

**⚠️ CRITICAL**: Both user stories depend on this state being available

- [x] T003 Add fullscreen signal (non-persisted) to layout context init function in packages/app/src/context/layout.tsx
- [x] T004 Add `fullscreen` accessor to filePreview object in packages/app/src/context/layout.tsx
- [x] T005 Add `enterFullscreen()` method to filePreview object in packages/app/src/context/layout.tsx
- [x] T006 Add `exitFullscreen()` method to filePreview object in packages/app/src/context/layout.tsx
- [x] T007 Add `toggleFullscreen()` method to filePreview object in packages/app/src/context/layout.tsx
- [x] T008 Modify `close()` method to exit fullscreen before closing in packages/app/src/context/layout.tsx

**Checkpoint**: Layout context now provides fullscreen state and methods. User story implementation can begin.

---

## Phase 3: User Story 1 - Enter Fullscreen Preview (Priority: P1) 🎯 MVP

**Goal**: User can click a fullscreen button to expand the preview panel to cover the entire application window

**Independent Test**: Open a file preview, click the fullscreen button, verify content expands to full window with file name header visible

### Implementation for User Story 1

- [x] T009 [US1] Update container div with conditional classList for fullscreen mode in packages/app/src/components/file-preview-panel.tsx
- [x] T010 [US1] Add `data-fullscreen` attribute to container for CSS targeting in packages/app/src/components/file-preview-panel.tsx
- [x] T011 [US1] Wrap header buttons in a flex container div in packages/app/src/components/file-preview-panel.tsx
- [x] T012 [US1] Add fullscreen toggle IconButton with `expand` icon to header in packages/app/src/components/file-preview-panel.tsx
- [x] T013 [US1] Add dynamic aria-label based on fullscreen state to toggle button in packages/app/src/components/file-preview-panel.tsx
- [x] T013a [US1] Render FilePreviewPanel at layout root level for true fullscreen coverage in packages/app/src/pages/layout.tsx
- [x] T013b [US1] Update session.tsx to skip rendering FilePreviewPanel when in fullscreen mode in packages/app/src/pages/session.tsx

**Checkpoint**: User Story 1 complete - fullscreen entry is functional and testable independently

---

## Phase 4: User Story 2 - Exit Fullscreen Preview (Priority: P1)

**Goal**: User can exit fullscreen mode via button click or Escape key to return to normal panel view

**Independent Test**: Enter fullscreen mode, click expand button or press Escape, verify return to normal layout with same file displayed

### Implementation for User Story 2

- [x] T014 [US2] Update handleKeyDown function to check fullscreen state before closing panel in packages/app/src/components/file-preview-panel.tsx
- [x] T015 [US2] Add fullscreen exit logic with priority over panel close in handleKeyDown in packages/app/src/components/file-preview-panel.tsx

**Checkpoint**: User Story 2 complete - fullscreen exit is functional. Both stories now work together as a complete feature.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Edge case handling and final validation

- [ ] T016 [P] Verify fullscreen mode works with text file preview (manual test)
- [ ] T017 [P] Verify fullscreen mode works with markdown file preview (manual test)
- [ ] T018 [P] Verify fullscreen mode works with image file preview (manual test)
- [ ] T019 [P] Verify fullscreen mode works with code file preview (manual test)
- [ ] T020 Verify window resize behavior in fullscreen mode (manual test)
- [ ] T021 Verify file selection change while in fullscreen mode (manual test)
- [ ] T022 Run full quickstart.md validation checklist (manual test)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - verification only
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase
- **User Story 2 (Phase 4)**: Depends on Foundational phase (can run parallel to US1 if desired)
- **Polish (Phase 5)**: Depends on both user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Enter Fullscreen - Requires T003-T008 (Foundational)
- **User Story 2 (P1)**: Exit Fullscreen - Requires T003-T008 (Foundational), integrates with US1 but independently testable

### Within Each Phase

**Foundational (Phase 2)**:
- T003 must complete before T004-T008 (signal must exist first)
- T004-T007 can run in parallel (different methods)
- T008 should complete last (modifies existing method)

**User Story 1 (Phase 3)**:
- T009-T010 (container changes) should complete first
- T011-T013 (header changes) depend on container being ready

**User Story 2 (Phase 4)**:
- T014-T015 modify same function, should be done sequentially

### Parallel Opportunities

```bash
# Foundational - methods can be added in parallel:
T004: Add fullscreen accessor
T005: Add enterFullscreen method
T006: Add exitFullscreen method
T007: Add toggleFullscreen method

# Polish - file type verification can run in parallel:
T016: Text file preview
T017: Markdown file preview
T018: Image file preview
T019: Code file preview
```

---

## Implementation Strategy

### MVP First (User Stories 1 & 2)

Since both stories are P1 (equally critical) and together form the core feature:

1. Complete Phase 1: Setup (verification)
2. Complete Phase 2: Foundational (state management)
3. Complete Phase 3: User Story 1 (enter fullscreen)
4. Complete Phase 4: User Story 2 (exit fullscreen)
5. **STOP and VALIDATE**: Test the complete enter/exit flow
6. Complete Phase 5: Polish (edge cases)

### Incremental Delivery

1. After Phase 2 → Foundation ready for testing state API
2. After Phase 3 → Can enter fullscreen (partial feature)
3. After Phase 4 → Complete feature cycle (MVP!)
4. After Phase 5 → Production-ready with edge case handling

### Estimated Scope

- **Total tasks**: 22
- **User Story 1 tasks**: 5
- **User Story 2 tasks**: 2
- **Foundational tasks**: 6
- **Polish/verification tasks**: 7
- **Files modified**: 2 (layout.tsx, file-preview-panel.tsx)
- **Estimated LOC**: ~50 lines

---

## Notes

- [P] tasks = different files or independent operations, no dependencies
- [Story] label maps task to specific user story for traceability
- Both user stories are P1 priority - they form one complete feature together
- No automated tests - manual testing per quickstart.md
- Commit after each phase or logical group of tasks
- Stop at any checkpoint to validate independently
