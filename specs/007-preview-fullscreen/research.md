# Research: Preview Fullscreen Mode

**Feature**: 007-preview-fullscreen
**Date**: 2026-01-18

## Research Summary

This document captures technical research findings for implementing fullscreen mode on the file preview panel.

---

## 1. Existing Layout State Management

### Decision
Use the existing `layout.tsx` context pattern with `createStore` and `persisted` wrapper.

### Rationale
- Consistent with all other layout state (sidebar, terminal, session, filePreview)
- Automatic persistence to localStorage/Tauri store
- Reactive updates via Solid.js signals/memos
- Well-tested pattern already in production

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Component-local state | No persistence, state lost on remount |
| Separate fullscreen context | Over-engineering for single boolean |
| URL-based state | Not appropriate for UI mode state |

### Key Code Reference
```typescript
// packages/app/src/context/layout.tsx:95-99
filePreview: {
  opened: false,
  width: 400,
  filePath: null as string | null,
}
```

---

## 2. Fullscreen Rendering Approach

### Decision
Render fullscreen preview as a fixed-position overlay with high z-index, similar to dialog/modal pattern.

### Rationale
- Fixed positioning ensures full window coverage regardless of scroll position
- High z-index (50+) ensures overlay appears above all content
- Existing dialog.css provides animation patterns for enter/exit
- Preserves the same component for both modes (no content remount needed)

### Alternatives Considered
| Alternative | Why Rejected |
|-------------|--------------|
| Layout expansion (resize to fill) | Complex, affects other panels, poor transitions |
| Portal to document body | Loses React context, complicates state access |
| New route for fullscreen | Over-engineering, loses navigation state |

### Key Code Reference
```css
/* packages/ui/src/components/dialog.css - overlay pattern */
position: fixed;
inset: 0;
z-index: 50;
```

---

## 3. Icon Selection

### Decision
Use the existing `expand` icon for entering fullscreen mode.

### Rationale
- Already available in icon sprite (`packages/ui/src/components/icon.tsx:20`)
- Universally recognized expand/fullscreen metaphor
- Consistent with other app iconography

### Key Code Reference
```typescript
// packages/ui/src/components/icon.tsx:20
expand: `<path d="M4.58301 10.4163V15.4163H9.58301M10.4163 4.58301H15.4163V9.58301" stroke="currentColor" stroke-linecap="square"/>`,
```

---

## 4. Keyboard Handling

### Decision
Extend existing Escape key handler to handle fullscreen exit, with fullscreen taking priority.

### Rationale
- FilePreviewPanel already has Escape key binding to close panel (line 157-162)
- Fullscreen exit should take precedence over panel close
- Single keyboard handler simplifies logic

### Implementation Pattern
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    if (layout.filePreview.fullscreen()) {
      layout.filePreview.exitFullscreen()
    } else {
      layout.filePreview.close()
    }
  }
}
```

---

## 5. State Persistence

### Decision
Persist fullscreen state with existing layout persistence (optional - can skip if not desired).

### Rationale
- Consistency with other layout states
- However, fullscreen is a transient UI state - may not need persistence
- Starting with non-persisted state for MVP, can add persistence if requested

### Implementation Note
If we decide to persist:
```typescript
filePreview: {
  opened: false,
  width: 400,
  filePath: null as string | null,
  fullscreen: false,  // Add to store
}
```

If we keep non-persisted (recommended):
```typescript
// In layout context, outside the persisted store
const [fullscreen, setFullscreen] = createSignal(false)
```

---

## 6. Component Architecture

### Decision
Keep fullscreen logic within FilePreviewPanel component, controlled by layout context state.

### Rationale
- Single component handles both normal and fullscreen modes
- No component remounting - content state preserved
- Simpler mental model

### Component Structure
```
FilePreviewPanel
├── Normal Mode: flex container in session layout
└── Fullscreen Mode: fixed overlay with same internal structure
```

---

## 7. Z-Index Strategy

### Decision
Use z-index 60 for fullscreen preview overlay.

### Rationale
- Dialog uses z-index 50
- Toast uses z-index 50+
- Mobile sidebar uses z-index 40-50
- Fullscreen preview should be above most UI but can be below dialogs if needed

---

## 8. Animation/Transition

### Decision
Use instant transition for MVP, can add fade animation later if desired.

### Rationale
- Keeps implementation simple
- Avoids animation complexity with content preservation
- Can iterate on polish later

---

## Questions Resolved

| Question | Answer |
|----------|--------|
| Where to store fullscreen state? | Layout context, non-persisted initially |
| How to render fullscreen? | Fixed overlay with z-index 60 |
| Which icon to use? | `expand` (already available) |
| How to handle Escape key? | Extend existing handler with priority |
| Persist fullscreen state? | No (transient UI state) |
