# Implementation Plan: Built-in Scheduler Plugin

**Branch**: `008-scheduler-plugin` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-scheduler-plugin/spec.md`

## Summary

Add `opencode-scheduler` (v1.1.0) as a built-in plugin with a visual management UI. The implementation includes:
1. Plugin registration in BUILTIN array (DONE)
2. Jobs management panel in the app UI (NEW)
3. Create/Edit/Delete job dialogs (NEW)
4. Execution history view (NEW)

## Technical Context

**Language/Version**: TypeScript 5.8.2 (frontend), Rust 2024 Edition (Tauri backend)
**Primary Dependencies**:
- `opencode-scheduler@1.1.0` - Core scheduling functionality
- `@opencode-ai/plugin` - Plugin interface
- Solid.js 1.9.10 - UI framework
- @kobalte/core 0.13.11 - UI components
- Tailwind CSS 4.1.11 - Styling
**Storage**: File system (`~/.config/opencode/jobs/`, `~/.config/opencode/logs/`)
**Testing**: Bun test, manual verification
**Target Platform**: macOS (launchd), Linux (systemd)
**Project Type**: Monorepo with existing plugin architecture
**Performance Goals**: Job scheduling in <30s, UI updates within 1s
**Constraints**: No Windows support, requires OS-level scheduler permissions
**Scale/Scope**: Single user, local machine scheduling

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Constitution template not configured. Proceeding with standard development practices:
- [x] Follows existing plugin architecture patterns
- [x] Uses established BUILTIN plugin mechanism
- [x] Follows existing UI patterns (panel, dialog, collapsible)
- [x] Leverages existing tested npm package

## Project Structure

### Documentation (this feature)

```text
specs/008-scheduler-plugin/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output - technical decisions
├── data-model.md        # Phase 1 output - entity definitions
├── quickstart.md        # Phase 1 output - implementation guide
├── contracts/           # Phase 1 output - tool API contracts
│   └── tools.yaml       # OpenAPI spec for scheduler tools
├── checklists/          # Quality checklists
│   └── requirements.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
packages/opencode/src/
├── plugin/
│   └── index.ts                    # DONE: Add to BUILTIN array
└── tool/
    └── registry.ts                 # Auto-discovers plugin tools (no changes)

packages/app/src/
├── context/
│   ├── layout.tsx                  # MODIFY: Add scheduledJobs panel state
│   └── scheduled-jobs.tsx          # NEW: Jobs data context/store
├── components/
│   ├── scheduled-jobs-panel.tsx    # NEW: Main jobs panel component
│   ├── scheduled-job-item.tsx      # NEW: Individual job row/card
│   ├── scheduled-job-dialog.tsx    # NEW: Create/Edit job dialog
│   ├── job-execution-history.tsx   # NEW: Execution history list
│   └── job-log-viewer.tsx          # NEW: Log content viewer
└── pages/
    └── directory-layout.tsx        # MODIFY: Add jobs panel to layout

packages/ui/src/components/
└── (existing components used)      # Button, Dialog, Collapsible, etc.

# External dependency (npm)
node_modules/opencode-scheduler/
└── dist/
    └── index.js                    # Plugin implementation with 10 tools
```

**Structure Decision**:
- Plugin registration: Minimal (single line) - DONE
- UI: New panel following existing patterns (FilePreviewPanel, WorkspaceSidebar)
- State: New context for jobs data with SDK integration
- Components: Modular components following existing patterns

## Complexity Tracking

| Addition | Justification |
|----------|---------------|
| New panel (scheduledJobs) | Required for visual management (FR-016) |
| New context (scheduled-jobs.tsx) | Centralized job state management |
| 5 new components | Modular UI following existing patterns |

## Phase Outputs

### Phase 0: Research (Complete)

See [research.md](./research.md) for:
- Plugin integration approach (BUILTIN vs internal)
- Version management strategy
- OS scheduler backend selection
- Storage location decisions
- Tool API design rationale
- Risk assessment

### Phase 1: Design (Complete)

| Artifact | Location | Description |
|----------|----------|-------------|
| Data Model | [data-model.md](./data-model.md) | ScheduledJob, JobExecution, ExecutionLog entities |
| Contracts | [contracts/tools.yaml](./contracts/tools.yaml) | OpenAPI spec for 10 tools |
| Quickstart | [quickstart.md](./quickstart.md) | Implementation and verification guide |

## Implementation Summary

### Changes Required

| File | Change | Status |
|------|--------|--------|
| `packages/opencode/src/plugin/index.ts` | Add to BUILTIN array | DONE |
| `packages/app/src/context/layout.tsx` | Add scheduledJobs panel state | TODO |
| `packages/app/src/context/scheduled-jobs.tsx` | New jobs data context | TODO |
| `packages/app/src/components/scheduled-jobs-panel.tsx` | Main panel | TODO |
| `packages/app/src/components/scheduled-job-item.tsx` | Job item component | TODO |
| `packages/app/src/components/scheduled-job-dialog.tsx` | Create/Edit dialog | TODO |
| `packages/app/src/components/job-execution-history.tsx` | History list | TODO |
| `packages/app/src/components/job-log-viewer.tsx` | Log viewer | TODO |
| `packages/app/src/pages/directory-layout.tsx` | Add panel to layout | TODO |

### Tools Provided (by opencode-scheduler)

| Tool | Purpose | FR Mapping |
|------|---------|------------|
| `schedule_job` | Create scheduled task | FR-002, FR-003 |
| `list_jobs` | List all jobs | FR-005 |
| `get_job` | View job details | FR-006 |
| `update_job` | Modify job | FR-007 |
| `delete_job` | Remove job | FR-008 |
| `job_logs` | View execution logs | FR-009 |
| `run_job` | Immediate execution | FR-010 |
| `get_skill` | Browse templates | P3 story |
| `install_skill` | Use template | P3 story |
| `get_version` | Version info | Debugging |

### UI Components Mapping

| Component | FR Mapping | Description |
|-----------|------------|-------------|
| ScheduledJobsPanel | FR-016 | Main panel showing job list |
| ScheduledJobItem | FR-018, FR-024 | Job row with status indicators |
| ScheduledJobDialog | FR-017, FR-019 | Create/Edit job form |
| Enable/Disable Toggle | FR-021 | Toggle in job item |
| Delete Button | FR-020 | Delete with confirmation |
| Run Now Button | FR-022 | Immediate execution |
| JobExecutionHistory | FR-023 | Execution history list |
| JobLogViewer | FR-009 | Log content display |

### Acceptance Criteria Mapping

| Success Criterion | Verification Method |
|-------------------|---------------------|
| SC-001: Schedule in <30s | Manual timing test (chat) |
| SC-002: View all jobs | Panel shows all jobs |
| SC-003: 99% accuracy | Schedule job, verify execution time |
| SC-004: Survives reboot | Reboot, verify job persists |
| SC-005: Troubleshoot in 3 interactions | Log review workflow |
| SC-006: Update/delete in <15s | Manual timing test |
| SC-007: No extra config | Fresh install verification |
| SC-008: Panel access | Single click from toolbar |
| SC-009: Create via UI in <60s | Dialog workflow timing |
| SC-010: UI updates in <1s | Visual verification |
| SC-011: History visible | Expand job, see history |

## Next Steps

Run `/speckit.tasks` to generate actionable implementation tasks for the UI components.
