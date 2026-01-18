/**
 * Layout Context Contract for Preview Fullscreen Feature
 *
 * This file defines the TypeScript interface contract for the filePreview
 * extension in the layout context.
 */

import type { Accessor } from "solid-js"

/**
 * FilePreview state and methods exposed by the layout context.
 *
 * This interface extends the existing filePreview object with fullscreen capabilities.
 */
export interface FilePreviewContext {
  // ==========================================
  // Existing Properties (unchanged)
  // ==========================================

  /**
   * Whether the file preview panel is currently visible.
   */
  opened: Accessor<boolean>

  /**
   * The path of the currently previewed file, or null if no file is open.
   */
  filePath: Accessor<string | null>

  /**
   * The width of the preview panel in pixels (clamped to 200-800).
   */
  width: Accessor<number>

  // ==========================================
  // Existing Methods (unchanged)
  // ==========================================

  /**
   * Opens the preview panel with the specified file.
   * @param filePath - The path of the file to preview
   */
  open(filePath: string): void

  /**
   * Closes the preview panel and clears the file path.
   * Also exits fullscreen mode if active.
   */
  close(): void

  /**
   * Resizes the preview panel width.
   * @param width - The new width in pixels (will be clamped to 200-800)
   */
  resize(width: number): void

  // ==========================================
  // NEW: Fullscreen Properties
  // ==========================================

  /**
   * Whether the preview panel is currently in fullscreen mode.
   *
   * When true, the preview panel should render as a fixed overlay
   * covering the entire application window.
   */
  fullscreen: Accessor<boolean>

  // ==========================================
  // NEW: Fullscreen Methods
  // ==========================================

  /**
   * Enters fullscreen mode.
   *
   * @precondition opened() === true
   * @postcondition fullscreen() === true
   *
   * If the panel is not opened, this is a no-op.
   */
  enterFullscreen(): void

  /**
   * Exits fullscreen mode.
   *
   * @postcondition fullscreen() === false
   *
   * The panel remains open after exiting fullscreen.
   */
  exitFullscreen(): void

  /**
   * Toggles fullscreen mode.
   *
   * @precondition opened() === true (for entering fullscreen)
   *
   * If fullscreen is active, exits fullscreen.
   * If fullscreen is inactive and panel is open, enters fullscreen.
   * If panel is closed, this is a no-op.
   */
  toggleFullscreen(): void
}

/**
 * Example usage in a component:
 *
 * ```tsx
 * function FilePreviewPanel() {
 *   const layout = useLayout()
 *
 *   return (
 *     <div
 *       classList={{
 *         "fixed inset-0 z-60": layout.filePreview.fullscreen(),
 *         "relative flex-1": !layout.filePreview.fullscreen(),
 *       }}
 *     >
 *       <header>
 *         <IconButton
 *           icon="expand"
 *           onClick={() => layout.filePreview.toggleFullscreen()}
 *         />
 *         <IconButton
 *           icon="close"
 *           onClick={() => layout.filePreview.close()}
 *         />
 *       </header>
 *       {/* content */}
 *     </div>
 *   )
 * }
 * ```
 */
