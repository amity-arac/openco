# Quickstart: Preview Fullscreen Mode

**Feature**: 007-preview-fullscreen
**Date**: 2026-01-18

## Overview

This guide walks through implementing fullscreen mode for the file preview panel. The implementation requires changes to 2 files.

---

## Implementation Steps

### Step 1: Extend Layout Context

**File**: `packages/app/src/context/layout.tsx`

Add fullscreen state and methods to the `filePreview` object.

#### 1.1 Add fullscreen signal (non-persisted)

Inside the `init` function, after the persisted store setup:

```typescript
// Add after line ~107 (after createStore definition)
const [previewFullscreen, setPreviewFullscreen] = createSignal(false)
```

#### 1.2 Extend filePreview return object

Update the `filePreview` object (around line 424-453) to include:

```typescript
filePreview: {
  // ... existing properties ...
  opened: createMemo(() => store.filePreview?.opened ?? false),
  filePath: createMemo(() => store.filePreview?.filePath ?? null),
  width: createMemo(() => store.filePreview?.width ?? 400),

  // NEW: Fullscreen state
  fullscreen: previewFullscreen,

  // ... existing methods ...
  open(filePath: string) { /* existing */ },

  close() {
    // MODIFIED: Exit fullscreen when closing
    setPreviewFullscreen(false)
    if (!store.filePreview) {
      setStore("filePreview", { opened: false, width: 400, filePath: null })
      return
    }
    setStore("filePreview", "opened", false)
    setStore("filePreview", "filePath", null)
  },

  resize(width: number) { /* existing */ },

  // NEW: Fullscreen methods
  enterFullscreen() {
    if (!store.filePreview?.opened) return
    setPreviewFullscreen(true)
  },

  exitFullscreen() {
    setPreviewFullscreen(false)
  },

  toggleFullscreen() {
    if (!store.filePreview?.opened) return
    setPreviewFullscreen((prev) => !prev)
  },
},
```

---

### Step 2: Update FilePreviewPanel Component

**File**: `packages/app/src/components/file-preview-panel.tsx`

#### 2.1 Add expand button to header

Update the header section (around line 179-200):

```tsx
{/* Header */}
<div
  data-slot="preview-header"
  class="h-12 px-3 flex items-center justify-between shrink-0 border-b border-border-weak-base vibrancy"
>
  <div class="flex items-center gap-2 min-w-0">
    <span class="text-12-medium text-text-base font-medium truncate">
      {file()?.name ?? "Preview"}
    </span>
    <Show when={showSizeWarning()}>
      <span class="text-11-regular text-text-warning">
        (Large file)
      </span>
    </Show>
  </div>
  {/* Button group */}
  <div class="flex items-center gap-1">
    {/* NEW: Fullscreen toggle button */}
    <IconButton
      icon="expand"
      size="normal"
      variant="ghost"
      onClick={() => layout.filePreview.toggleFullscreen()}
      aria-label={layout.filePreview.fullscreen() ? "Exit fullscreen" : "Enter fullscreen"}
    />
    <IconButton
      icon="close"
      size="normal"
      variant="ghost"
      onClick={() => layout.filePreview.close()}
      aria-label="Close preview"
    />
  </div>
</div>
```

#### 2.2 Update container styling for fullscreen mode

Update the main container div (around line 173-177):

```tsx
return (
  <div
    data-component="file-preview-panel"
    data-fullscreen={layout.filePreview.fullscreen() ? "true" : undefined}
    classList={{
      "flex flex-col h-full min-w-0": true,
      // Normal mode styling
      "flex-1 border-l border-border-weak-base glass-panel": !layout.filePreview.fullscreen(),
      // Fullscreen mode styling
      "fixed inset-0 z-60 bg-background-base": layout.filePreview.fullscreen(),
    }}
  >
```

#### 2.3 Update Escape key handler

Update the `handleKeyDown` function (around line 158-162):

```tsx
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

## Testing Checklist

### Manual Testing

1. **Enter fullscreen**
   - [ ] Open a file in preview panel
   - [ ] Click the expand button
   - [ ] Verify preview covers full window
   - [ ] Verify file content is still displayed

2. **Exit fullscreen**
   - [ ] Click the expand button again
   - [ ] Verify preview returns to normal panel mode
   - [ ] Verify same file is still displayed

3. **Exit with Escape key**
   - [ ] Enter fullscreen mode
   - [ ] Press Escape
   - [ ] Verify fullscreen exits (panel remains open)

4. **Close from fullscreen**
   - [ ] Enter fullscreen mode
   - [ ] Click close button
   - [ ] Verify both fullscreen and panel close

5. **File type support**
   - [ ] Test fullscreen with text file
   - [ ] Test fullscreen with markdown file
   - [ ] Test fullscreen with image file
   - [ ] Test fullscreen with code file

6. **Window resize**
   - [ ] Enter fullscreen mode
   - [ ] Resize browser window
   - [ ] Verify fullscreen adapts to new dimensions

---

## Key Files Summary

| File | Changes |
|------|---------|
| `packages/app/src/context/layout.tsx` | Add fullscreen signal and methods |
| `packages/app/src/components/file-preview-panel.tsx` | Add button, update styling, handle Escape |

---

## Common Issues

### Fullscreen not covering window
- Ensure `fixed inset-0` classes are applied
- Check z-index is high enough (60+)
- Verify `bg-background-base` prevents see-through

### Content not displaying in fullscreen
- Ensure the content container has `flex-1` and `overflow-hidden`
- Check that `min-h-0` is present for flex children

### Escape key not working
- Verify keyboard event listener is active when fullscreen
- Check that no other component is preventing event propagation
