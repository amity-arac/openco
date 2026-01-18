# Tasks: Built-in Scheduler Plugin with UI

**Input**: Design documents from `/specs/008-scheduler-plugin/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: No automated tests explicitly requested. Manual verification per quickstart.md.

**Organization**: Tasks organized by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US6)
- Include exact file paths in descriptions

## Summary

This feature adds the `opencode-scheduler` as a built-in plugin plus a visual management UI.

**User Stories from Spec**:
- US1 (P1): Schedule a Recurring Task (chat-based) - DONE via plugin
- US2 (P1): View and Manage Existing Jobs (chat-based) - DONE via plugin
- US3 (P2): View Job Execution Logs (chat-based) - DONE via plugin
- US4 (P2): Run Job Immediately (chat-based) - DONE via plugin
- US5 (P3): Use Skill Templates (chat-based) - DONE via plugin
- **US6 (P1): Visual Job Management Panel** - NEW
- **US7 (P2): View Execution History in Panel** - NEW

---

## Phase 1: Setup (COMPLETE)

**Purpose**: Register the scheduler plugin as a built-in plugin

- [x] T001 Add `"opencode-scheduler@1.1.0"` to BUILTIN array in packages/opencode/src/plugin/index.ts

**Checkpoint**: Plugin registration complete

---

## Phase 2: Foundational - Layout & Context

**Purpose**: Add panel state to layout and create jobs data context

- [ ] T002 Add `scheduledJobs` panel state to layout store in packages/app/src/context/layout.tsx
- [ ] T003 [P] Create scheduled jobs context/store in packages/app/src/context/scheduled-jobs.tsx

**Implementation Detail for T002**:
Add to the layout store:
```typescript
scheduledJobs: {
  opened: persisted(false, "layout.v8.scheduledJobs.opened"),
  width: persisted(320, "layout.v8.scheduledJobs.width"),
},
```
Add methods: `openScheduledJobs()`, `closeScheduledJobs()`, `toggleScheduledJobs()`, `resizeScheduledJobs()`

**Implementation Detail for T003**:
Create context that:
- Fetches jobs from `~/.config/opencode/jobs/` directory
- Provides CRUD operations via plugin tools
- Tracks loading/error states
- Refreshes on file changes

**Checkpoint**: Foundation ready for UI components

---

## Phase 3: User Story 6 - Visual Job Management Panel (Priority: P1)

**Goal**: Users can visually browse, create, edit, and delete scheduled jobs

**Independent Test**: Open panel, view jobs, create/edit/delete via UI

### Implementation for US6

- [ ] T004 [US6] Create ScheduledJobsPanel component in packages/app/src/components/scheduled-jobs-panel.tsx
- [ ] T005 [US6] Create ScheduledJobItem component in packages/app/src/components/scheduled-job-item.tsx
- [ ] T006 [US6] Create ScheduledJobDialog component in packages/app/src/components/scheduled-job-dialog.tsx
- [ ] T007 [US6] Add jobs panel toggle button to toolbar in packages/app/src/pages/session.tsx
- [ ] T008 [US6] Integrate ScheduledJobsPanel into directory layout in packages/app/src/pages/directory-layout.tsx

**Implementation Detail for T004** (ScheduledJobsPanel):
```typescript
// Pattern: Similar to FilePreviewPanel
// - Header with title "Scheduled Jobs" + Add button + Close button
// - Scrollable list of ScheduledJobItem components
// - Empty state when no jobs
// - Loading state
// - Resizable width (200-500px)
```

**Implementation Detail for T005** (ScheduledJobItem):
```typescript
// - Job name (clickable to expand)
// - Schedule display (human-readable cron)
// - Status indicator (enabled/disabled/running/failed)
// - Last run time
// - Collapsible details section:
//   - Task description
//   - Working directory
//   - Actions: Edit, Run Now, Delete, Enable/Disable toggle
```

**Implementation Detail for T006** (ScheduledJobDialog):
```typescript
// Dialog with form fields:
// - Name (text input)
// - Task description (textarea)
// - Schedule (cron input with helper text)
// - Working directory (optional, defaults to current)
// - Buttons: Cancel, Save
// Mode: "create" | "edit"
```

**Checkpoint**: US6 complete - users can manage jobs visually

---

## Phase 4: User Story 7 - Execution History in Panel (Priority: P2)

**Goal**: Users can view execution history and logs in the panel

**Independent Test**: Select a job, view execution history, click to see logs

### Implementation for US7

- [ ] T009 [US7] Create JobExecutionHistory component in packages/app/src/components/job-execution-history.tsx
- [ ] T010 [US7] Create JobLogViewer component in packages/app/src/components/job-log-viewer.tsx
- [ ] T011 [US7] Integrate execution history into ScheduledJobItem expanded view

**Implementation Detail for T009** (JobExecutionHistory):
```typescript
// List of recent executions:
// - Timestamp
// - Duration
// - Status (success/failure icon)
// - Clickable to show logs
// Sorted by most recent first
```

**Implementation Detail for T010** (JobLogViewer):
```typescript
// Modal or inline view showing:
// - Execution metadata (start, end, status)
// - Log output (scrollable, monospace)
// - Error highlighting for failures
```

**Checkpoint**: US7 complete - users can view execution history in panel

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and refinements

- [ ] T012 Add keyboard shortcut to toggle jobs panel (e.g., Cmd+J)
- [ ] T013 Add "calendar" or "clock" icon for jobs panel toggle button
- [ ] T014 Verify panel persistence across sessions (state saved/restored)
- [ ] T015 Test create job flow end-to-end via UI
- [ ] T016 Test edit job flow end-to-end via UI
- [ ] T017 Test delete job flow with confirmation
- [ ] T018 Test enable/disable toggle
- [ ] T019 Test run now button
- [ ] T020 Test execution history display
- [ ] T021 Verify all success criteria (SC-001 through SC-011)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: COMPLETE
- **Phase 2 (Foundational)**: Must complete before Phase 3-4
- **Phase 3 (US6)**: Depends on Phase 2
- **Phase 4 (US7)**: Depends on Phase 3 (needs job item to integrate into)
- **Phase 5 (Polish)**: Depends on Phase 3-4

### Task Dependencies Within Phases

**Phase 2**:
- T002 and T003 can run in parallel [P]

**Phase 3**:
- T004, T005, T006 can start in parallel (different files)
- T007 and T008 depend on T004 being complete

**Phase 4**:
- T009 and T010 can run in parallel
- T011 depends on T009, T010, and T005

### Parallel Opportunities

```bash
# Phase 2 parallel:
Task T002: "Add scheduledJobs panel state to layout"
Task T003: "Create scheduled jobs context"

# Phase 3 parallel:
Task T004: "Create ScheduledJobsPanel"
Task T005: "Create ScheduledJobItem"
Task T006: "Create ScheduledJobDialog"

# Phase 4 parallel:
Task T009: "Create JobExecutionHistory"
Task T010: "Create JobLogViewer"
```

---

## Implementation Strategy

### MVP First (US6 Only)

1. Complete Phase 2 (layout + context)
2. Complete T004-T006 (core components)
3. Complete T007-T008 (integration)
4. **STOP and VALIDATE**: Can view and manage jobs in panel
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 2 → Foundation ready
2. Phase 3 → Visual management works (MVP!)
3. Phase 4 → Execution history visible
4. Phase 5 → Polish and final validation

---

## Files to Create/Modify

| File | Action | Phase |
|------|--------|-------|
| `packages/opencode/src/plugin/index.ts` | DONE | 1 |
| `packages/app/src/context/layout.tsx` | Modify | 2 |
| `packages/app/src/context/scheduled-jobs.tsx` | Create | 2 |
| `packages/app/src/components/scheduled-jobs-panel.tsx` | Create | 3 |
| `packages/app/src/components/scheduled-job-item.tsx` | Create | 3 |
| `packages/app/src/components/scheduled-job-dialog.tsx` | Create | 3 |
| `packages/app/src/pages/session.tsx` | Modify | 3 |
| `packages/app/src/pages/directory-layout.tsx` | Modify | 3 |
| `packages/app/src/components/job-execution-history.tsx` | Create | 4 |
| `packages/app/src/components/job-log-viewer.tsx` | Create | 4 |

---

## Notes

- Plugin provides all backend functionality via tools
- UI calls plugin tools for CRUD operations
- Jobs stored in `~/.config/opencode/jobs/`
- Logs stored in `~/.config/opencode/logs/`
- Follow existing patterns from FilePreviewPanel and WorkspaceSidebar
- Use Kobalte components (Dialog, Collapsible, Button, etc.)
- Use Tailwind for styling with existing design tokens
