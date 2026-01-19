import { Show, createSignal, createEffect, on, createMemo, onCleanup } from "solid-js"
import { Portal } from "solid-js/web"
import { useLayout } from "@/context/layout"
import { useLocal, type LocalFile } from "@/context/local"
import { useFileActivity } from "@/context/file-activity"
import { useSync } from "@/context/sync"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Markdown } from "@opencode-ai/ui/markdown"
import { getPreviewType, validateContent, getLanguageFromFilename, isSvgFile, getImageMimeType, getCsvDelimiter } from "./file-preview"
import { TextPreview } from "./file-preview/text-preview"
import { HtmlPreview } from "./file-preview/html-preview"
import { CodePreview } from "./file-preview/code-preview"
import { ImagePreview } from "./file-preview/image-preview"
import { JsonPreview } from "./file-preview/json-preview"
import { XmlPreview } from "./file-preview/xml-preview"
import { CsvPreview } from "./file-preview/csv-preview"
import { PdfPreview } from "./file-preview/pdf-preview"
import { DocxPreview } from "./file-preview/docx-preview"
import { XlsxPreview } from "./file-preview/xlsx-preview"
import type { PreviewError } from "./file-preview/types"
import "./file-preview/file-preview.css"

/**
 * Standalone file preview panel for the main content area.
 * Displays file content in a resizable panel next to the chat.
 */
export function FilePreviewPanel() {
  const layout = useLayout()
  const local = useLocal()
  const sync = useSync()
  const fileActivity = useFileActivity()
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<PreviewError | null>(null)
  const [showSizeWarning, setShowSizeWarning] = createSignal(false)
  const [file, setFile] = createSignal<LocalFile | null>(null)
  const [refreshCounter, setRefreshCounter] = createSignal(0)

  // Get the file path from layout context
  const filePath = createMemo(() => layout.filePreview.filePath())

  // Get the preview type based on file extension
  const previewType = createMemo(() => {
    const f = file()
    if (!f) return null
    return getPreviewType(f.name)
  })

  // Subscribe to file activity events to refresh content when the current file is modified
  createEffect(() => {
    const unsub = fileActivity.subscribe((event) => {
      const currentPath = filePath()
      if (!currentPath) return

      // Get relative path for comparison
      const relativePath = local.file.relative(event.path)

      // If the currently previewed file was edited or created, trigger a refresh
      if (relativePath === currentPath && (event.activityType === "edited" || event.activityType === "created")) {
        // Increment refresh counter to trigger re-load
        setRefreshCounter((c) => c + 1)
      }
    })
    onCleanup(unsub)
  })

  // Load file when path changes or when refresh is triggered
  createEffect(
    on(
      () => [filePath(), refreshCounter()] as const,
      async ([path, _refresh]) => {
        if (!path) {
          setFile(null)
          setError(null)
          setShowSizeWarning(false)
          return
        }

        // === DEBUG LOGGING START ===
        console.group("[FilePreviewPanel] Loading file")
        console.log("Incoming path:", path)
        console.log("Workspace directory:", sync.data.path.directory)
        const relativePath = local.file.relative(path)
        console.log("Converted relative path:", relativePath)
        console.log("Expected format: relative from workspace root (e.g., 'src/file.ts')")
        console.groupEnd()
        // === DEBUG LOGGING END ===

        setError(null)
        setShowSizeWarning(false)
        setLoading(true)

        try {
          // Get node from local file system (this handles initialization and loading)
          const node = await local.file.node(path)

          // If node was loaded but we want fresh content, reload it
          if (node?.loaded) {
            await local.file.load(path)
          }

          // === DEBUG LOGGING START ===
          console.log("[FilePreviewPanel] File node result:", node ? "Found" : "NOT FOUND")
          if (!node) {
            console.warn("[FilePreviewPanel] Node not found for path:", relativePath)
          }
          // === DEBUG LOGGING END ===

          if (node) {
            setFile(node as LocalFile)
          } else {
            setError({
              type: "not_found",
              message: "File not found.",
            })
          }
        } catch (e) {
          console.error("[FilePreviewPanel] Error loading file:", e)
          setError({
            type: "not_found",
            message: "Failed to load file. The file may have been moved or deleted.",
          })
        } finally {
          setLoading(false)
        }
      },
      { defer: false }
    )
  )

  // Validate and prepare content
  const preparedContent = createMemo(() => {
    const f = file()
    if (!f?.content?.content) return null

    // Skip validation for binary files - they're handled separately
    const type = previewType()
    if (type === "image" || type === "pdf" || type === "docx" || type === "xlsx") {
      return null // Binary files are rendered directly without text validation
    }

    const result = validateContent(f.content.content)
    if (!result.valid) {
      setError(result.error)
      return null
    }

    setShowSizeWarning(result.showWarning)
    return {
      content: result.content,
      truncated: result.truncated,
    }
  })

  // Check if file is empty
  const isEmpty = createMemo(() => {
    const f = file()
    return f?.content?.content === ""
  })

  // Handle ESC key to exit fullscreen or close panel
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      // Exit fullscreen first if active, otherwise close panel
      if (layout.filePreview.fullscreen()) {
        layout.filePreview.exitFullscreen()
      } else {
        layout.filePreview.close()
      }
    }
  }

  createEffect(() => {
    if (layout.filePreview.opened()) {
      document.addEventListener("keydown", handleKeyDown)
    }
    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown)
    })
  })

  // The panel content - used in both normal and fullscreen modes
  const PanelContent = () => (
    <div
      data-component="file-preview-panel"
      data-fullscreen={layout.filePreview.fullscreen() ? "true" : undefined}
      classList={{
        "flex flex-col h-full min-w-0": true,
        // Normal mode styling
        "flex-1 border-l border-border-weak-base glass-panel": !layout.filePreview.fullscreen(),
        // Fullscreen mode styling - use fixed positioning to cover window below title bar (top-10 = 40px for titlebar)
        "fixed top-10 left-0 right-0 bottom-0 z-[100] bg-background-base": layout.filePreview.fullscreen(),
      }}
    >
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
          <div class="flex items-center gap-1">
            {/* Show expand button only in normal mode */}
            <Show when={!layout.filePreview.fullscreen()}>
              <IconButton
                icon="expand"
                size="normal"
                variant="ghost"
                onClick={() => layout.filePreview.toggleFullscreen()}
                aria-label="Enter fullscreen"
              />
            </Show>
            <IconButton
              icon="close"
              size="normal"
              variant="ghost"
              onClick={() => {
                // In fullscreen mode, exit fullscreen first instead of closing the panel
                if (layout.filePreview.fullscreen()) {
                  layout.filePreview.exitFullscreen()
                } else {
                  layout.filePreview.close()
                }
              }}
              aria-label={layout.filePreview.fullscreen() ? "Exit fullscreen" : "Close preview"}
            />
          </div>
        </div>

        {/* Content */}
        <div
          data-slot="preview-content"
          class="flex-1 overflow-hidden min-h-0 flex flex-col"
        >
          {/* Loading state */}
          <Show when={loading()}>
            <div class="flex items-center justify-center h-full p-4">
              <div class="flex items-center gap-2 text-text-muted">
                <svg
                  class="w-4 h-4 animate-spin"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="6"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-dasharray="28"
                    stroke-dashoffset="7"
                  />
                </svg>
                <span class="text-sm">Loading...</span>
              </div>
            </div>
          </Show>

          {/* Error state */}
          <Show when={!loading() && error()}>
            <div class="flex flex-col items-center justify-center h-full p-4 text-center">
              <svg
                class="w-8 h-8 mb-2 text-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span class="text-sm text-text-muted">{error()?.message}</span>
            </div>
          </Show>

          {/* Empty file state */}
          <Show when={!loading() && !error() && isEmpty()}>
            <div class="flex items-center justify-center h-full p-4">
              <span class="text-sm text-text-muted">This file is empty</span>
            </div>
          </Show>

          {/* Content preview */}
          <Show when={!loading() && !error() && !isEmpty() && preparedContent()}>
            {/* Text preview */}
            <Show when={previewType() === "text"}>
              <TextPreview
                content={preparedContent()!.content}
                truncated={preparedContent()!.truncated}
              />
            </Show>

            {/* Markdown preview */}
            <Show when={previewType() === "markdown"}>
              <div data-slot="markdown-wrapper" class="p-4">
                <Markdown
                  text={preparedContent()!.content}
                  cacheKey={filePath() ?? undefined}
                />
                <Show when={preparedContent()!.truncated}>
                  <div class="mt-4 pt-4 border-t border-border-weak-base text-center text-sm text-text-muted">
                    Content truncated. Showing first 100KB.
                  </div>
                </Show>
              </div>
            </Show>

            {/* HTML preview */}
            <Show when={previewType() === "html"}>
              <HtmlPreview content={preparedContent()!.content} />
              <Show when={preparedContent()!.truncated}>
                <div class="p-2 border-t border-border-weak-base text-center text-sm text-text-muted">
                  Content truncated. Showing first 100KB.
                </div>
              </Show>
            </Show>

            {/* Code preview */}
            <Show when={previewType() === "code"}>
              <CodePreview
                content={preparedContent()!.content}
                language={getLanguageFromFilename(file()?.name ?? "")}
                truncated={preparedContent()!.truncated}
              />
            </Show>

            {/* JSON preview */}
            <Show when={previewType() === "json"}>
              <JsonPreview
                content={preparedContent()!.content}
                truncated={preparedContent()!.truncated}
              />
            </Show>

            {/* XML preview */}
            <Show when={previewType() === "xml"}>
              <XmlPreview
                content={preparedContent()!.content}
                isSvg={isSvgFile(file()?.name ?? "")}
                truncated={preparedContent()!.truncated}
              />
            </Show>

            {/* CSV/TSV preview */}
            <Show when={previewType() === "csv"}>
              <CsvPreview
                content={preparedContent()!.content}
                delimiter={getCsvDelimiter(file()?.name ?? "")}
                truncated={preparedContent()!.truncated}
              />
            </Show>
          </Show>

          {/* Image preview - handled separately since images need special loading */}
          <Show when={!loading() && !error() && previewType() === "image" && file()}>
            <ImagePreview
              src={`data:${getImageMimeType(file()!.name)};base64,${file()!.content?.content ?? ""}`}
              alt={file()!.name}
              class="h-full"
            />
          </Show>

          {/* PDF preview - handled separately since PDFs are binary */}
          <Show when={!loading() && !error() && previewType() === "pdf" && file()}>
            <PdfPreview
              content={file()!.content?.content ?? ""}
            />
          </Show>

          {/* DOCX preview - handled separately since DOCX are binary */}
          <Show when={!loading() && !error() && previewType() === "docx" && file()}>
            <DocxPreview
              content={file()!.content?.content ?? ""}
            />
          </Show>

          {/* XLSX preview - handled separately since XLSX are binary */}
          <Show when={!loading() && !error() && previewType() === "xlsx" && file()}>
            <XlsxPreview
              content={file()!.content?.content ?? ""}
            />
          </Show>
        </div>
    </div>
  )

  // Use Portal to render at document root when fullscreen, allowing it to cover entire window
  // including sidebars. Normal mode renders inline in the session layout.
  return (
    <Show
      when={layout.filePreview.fullscreen()}
      fallback={<PanelContent />}
    >
      <Portal mount={document.body}>
        <PanelContent />
      </Portal>
    </Show>
  )
}
