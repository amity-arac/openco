# Implementation Plan: Preview Fullscreen Mode

**Branch**: `007-preview-fullscreen` | **Date**: 2026-01-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-preview-fullscreen/spec.md`

## Summary

Add a fullscreen mode toggle to the file preview panel, allowing users to expand the preview content to fill the entire application window for better visibility of file contents. The implementation extends the existing layout context with a fullscreen state and renders the preview panel as a fixed overlay when activated.

## Technical Context

**Language/Version**: TypeScript 5.8.2 (frontend), Rust 2024 Edition (Tauri backend)
**Primary Dependencies**: Solid.js 1.9.10, Tailwind CSS 4.1.11, @kobalte/core 0.13.11
**Storage**: Existing layout persistence via `@tauri-apps/plugin-store` (desktop) / localStorage (web)
**Testing**: Manual testing (no automated test framework currently in use for UI)
**Target Platform**: Desktop (Tauri) and Web
**Project Type**: Monorepo - packages/app (main UI), packages/ui (component library)
**Performance Goals**: Instant transitions (<100ms), no content flicker or reload
**Constraints**: Must preserve all existing preview functionality in fullscreen mode
**Scale/Scope**: 2-3 files modified, ~100 lines of code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template is not yet configured for this project. Proceeding with standard best practices:

### Pre-Design Check

| Principle | Status | Notes |
|-----------|--------|-------|
| Minimal Changes | ✅ Pass | Only modifying necessary files: layout context, preview panel |
| Existing Patterns | ✅ Pass | Following established patterns from sidebar/terminal toggle implementations |
| No Over-engineering | ✅ Pass | Simple boolean state + fixed overlay approach |
| Accessibility | ✅ Pass | Escape key support included per spec |

### Post-Design Check (Phase 1 Complete)

| Principle | Status | Notes |
|-----------|--------|-------|
| Minimal Changes | ✅ Pass | Final scope: 2 files (layout.tsx, file-preview-panel.tsx), ~50 LOC |
| Existing Patterns | ✅ Pass | Uses existing IconButton, createSignal, classList patterns |
| No Over-engineering | ✅ Pass | Non-persisted state keeps implementation simple |
| Accessibility | ✅ Pass | Escape key handler with fullscreen priority |
| Data Model | ✅ Pass | Single boolean state, no complex entities |
| Contracts | ✅ Pass | TypeScript interface defined, follows existing context pattern |

## Project Structure

### Documentation (this feature)

```text
specs/007-preview-fullscreen/
├── plan.md              # This file
├── research.md          # Phase 0 output - Technical research findings
├── data-model.md        # Phase 1 output - State model definition
├── quickstart.md        # Phase 1 output - Implementation guide
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
packages/
├── app/
│   └── src/
│       ├── components/
│       │   └── file-preview-panel.tsx  # Add fullscreen button + conditional rendering
│       ├── context/
│       │   └── layout.tsx              # Add fullscreen state to filePreview
│       └── pages/
│           └── session.tsx             # Handle fullscreen overlay z-index
└── ui/
    └── src/
        └── components/
            └── icon.tsx                # Verify expand icon available
```

**Structure Decision**: Existing monorepo structure maintained. Changes confined to `packages/app` for feature logic, using existing UI components from `packages/ui`.

## Complexity Tracking

No complexity violations identified. The implementation follows existing patterns:
- State management mirrors `sidebar.opened`, `terminal.opened` patterns
- UI toggle mirrors existing `IconButton` usage in panel headers
- Fullscreen overlay follows established dialog/modal patterns

## Implementation Approach

### State Management
Extend `layout.tsx` filePreview object with:
```typescript
filePreview: {
  // existing...
  fullscreen: false,
  toggleFullscreen() { ... },
  enterFullscreen() { ... },
  exitFullscreen() { ... },
}
```

### UI Implementation
1. Add expand/fullscreen icon button to preview panel header
2. When fullscreen active, render preview as fixed overlay (z-index 50+)
3. Show close button prominently in fullscreen mode
4. Bind Escape key to exit fullscreen

### Visual Design
- Fullscreen overlay: `fixed inset-0 z-50 bg-background-base`
- Header: Same styling as normal mode, positioned at top
- Content: Takes remaining height, preserves all functionality
