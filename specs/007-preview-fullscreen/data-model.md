# Data Model: Preview Fullscreen Mode

**Feature**: 007-preview-fullscreen
**Date**: 2026-01-18

## Overview

This feature introduces a single new state property to track fullscreen mode for the file preview panel. The data model is minimal by design, leveraging existing patterns.

---

## State Model

### FilePreview State (Extended)

The existing `filePreview` state object in the layout context will be extended:

```typescript
interface FilePreviewState {
  // Existing properties
  opened: boolean           // Whether the preview panel is visible
  width: number             // Panel width in pixels (200-800, default 400)
  filePath: string | null   // Path of the currently previewed file

  // New property
  fullscreen: boolean       // Whether fullscreen mode is active
}
```

### Initial State

```typescript
filePreview: {
  opened: false,
  width: 400,
  filePath: null,
  fullscreen: false,  // NEW
}
```

---

## State Transitions

### Fullscreen State Transitions

```
┌─────────────┐     enterFullscreen()     ┌─────────────┐
│  fullscreen │ ─────────────────────────▶│  fullscreen │
│   = false   │                           │   = true    │
└─────────────┘                           └─────────────┘
       ▲                                         │
       │                                         │
       │         exitFullscreen()                │
       └─────────────────────────────────────────┘
```

### Interaction with Panel Open/Close

| Action | fullscreen | opened | filePath |
|--------|------------|--------|----------|
| Open file preview | false | true | path |
| Enter fullscreen | true | true | (unchanged) |
| Exit fullscreen | false | true | (unchanged) |
| Close panel (normal) | false | false | null |
| Close panel (from fullscreen) | false | false | null |

**Rule**: Closing the panel always exits fullscreen first.

---

## API Methods

### Layout Context API Extension

```typescript
filePreview: {
  // Existing methods
  opened: Accessor<boolean>
  filePath: Accessor<string | null>
  width: Accessor<number>
  open(filePath: string): void
  close(): void
  resize(width: number): void

  // New methods
  fullscreen: Accessor<boolean>
  enterFullscreen(): void
  exitFullscreen(): void
  toggleFullscreen(): void
}
```

### Method Behaviors

| Method | Behavior |
|--------|----------|
| `enterFullscreen()` | Sets fullscreen to true. No-op if panel not opened. |
| `exitFullscreen()` | Sets fullscreen to false. |
| `toggleFullscreen()` | Toggles fullscreen state. No-op if panel not opened. |
| `close()` | Sets fullscreen to false, then closes panel. |

---

## Validation Rules

1. **Fullscreen requires opened panel**: Cannot enter fullscreen if `opened === false`
2. **Close clears fullscreen**: Closing the panel always sets `fullscreen = false`
3. **Fullscreen independent of width**: Fullscreen state doesn't affect stored width value

---

## Persistence

### Recommended: Non-persisted

Fullscreen is a transient UI state. Users typically don't expect to return to fullscreen mode after closing the app.

```typescript
// Implementation approach - non-persisted signal
const [fullscreen, setFullscreen] = createSignal(false)
```

### Alternative: Persisted (if requested)

If persistence is desired, add `fullscreen: false` to the persisted store object.

---

## Component Props

### FilePreviewPanel Component

No new props required. Component reads fullscreen state from layout context.

```typescript
// Component usage remains the same
<FilePreviewPanel />
```

The component internally:
1. Reads `layout.filePreview.fullscreen()`
2. Conditionally renders with fixed positioning when true
3. Shows expand/collapse button based on state

---

## Events

### Keyboard Events

| Key | Context | Action |
|-----|---------|--------|
| Escape | Fullscreen active | Exit fullscreen |
| Escape | Normal mode | Close panel |

### User Actions

| Action | Trigger |
|--------|---------|
| Click expand button | Toggle fullscreen |
| Click close button (fullscreen) | Exit fullscreen |
| Press Escape | Exit fullscreen (if active) or close panel |
