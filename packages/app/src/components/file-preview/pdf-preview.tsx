import { Show, createSignal, createEffect, onCleanup, For } from "solid-js"
import * as pdfjsLib from "pdfjs-dist"
import type { PdfPreviewProps } from "./types"

// Set the worker source - use CDN for the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * PDF Preview component that renders PDFs using PDF.js library.
 */
export function PdfPreview(props: PdfPreviewProps) {
  const [error, setError] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(true)
  const [pageCanvases, setPageCanvases] = createSignal<HTMLCanvasElement[]>([])
  const [totalPages, setTotalPages] = createSignal(0)
  const [scale, setScale] = createSignal(1.0)
  const [fitScale, setFitScale] = createSignal(1.0) // Scale to fit width

  let containerRef: HTMLDivElement | undefined
  let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null

  // Calculate scale to fit container width
  const calculateFitScale = async (): Promise<number> => {
    if (!pdfDoc || !containerRef) return 1.0

    // Get the first page to determine PDF dimensions
    const page = await pdfDoc.getPage(1)
    const defaultViewport = page.getViewport({ scale: 1.0 })

    // Get container width (minus padding)
    const containerWidth = containerRef.clientWidth - 32 // 16px padding on each side

    // Calculate scale to fit width
    const fitScale = containerWidth / defaultViewport.width

    return Math.min(fitScale, 2.0) // Cap at 200% to avoid oversized rendering
  }

  // Render a single page to a canvas
  const renderPage = async (pageNum: number, canvas: HTMLCanvasElement) => {
    if (!pdfDoc) return

    try {
      const page = await pdfDoc.getPage(pageNum)
      const actualScale = scale() * fitScale()
      const viewport = page.getViewport({ scale: actualScale })

      canvas.height = viewport.height
      canvas.width = viewport.width

      const context = canvas.getContext("2d")
      if (!context) return

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise
    } catch (err) {
      console.error(`Error rendering page ${pageNum}:`, err)
    }
  }

  // Load and render the PDF
  const loadPdf = async () => {
    if (!props.content) {
      setError("No PDF content provided")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Convert base64 to Uint8Array
      const binaryString = atob(props.content)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: bytes })
      pdfDoc = await loadingTask.promise

      setTotalPages(pdfDoc.numPages)

      // Calculate fit scale after a brief delay to ensure container is sized
      await new Promise((resolve) => requestAnimationFrame(resolve))
      const calculatedFitScale = await calculateFitScale()
      setFitScale(calculatedFitScale)

      // Create canvases for all pages
      const canvases: HTMLCanvasElement[] = []
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const canvas = document.createElement("canvas")
        canvas.className = "pdf-page-canvas"
        canvases.push(canvas)
      }
      setPageCanvases(canvases)

      // Render all pages
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        await renderPage(i, canvases[i - 1])
      }

      setLoading(false)
    } catch (err) {
      console.error("Error loading PDF:", err)
      setError(err instanceof Error ? err.message : "Failed to load PDF")
      setLoading(false)
    }
  }

  // Re-render pages when scale changes
  const reRenderPages = async () => {
    if (!pdfDoc) return

    const canvases = pageCanvases()
    for (let i = 1; i <= pdfDoc.numPages; i++) {
      await renderPage(i, canvases[i - 1])
    }
  }

  createEffect(() => {
    // Load PDF when content changes
    const content = props.content
    if (content) {
      loadPdf()
    }
  })

  createEffect(() => {
    // Re-render when scale changes
    const _ = scale()
    if (pdfDoc && pageCanvases().length > 0) {
      reRenderPages()
    }
  })

  onCleanup(() => {
    if (pdfDoc) {
      pdfDoc.destroy()
      pdfDoc = null
    }
  })

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3.0))
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.25))
  const resetZoom = () => setScale(1.0)

  // Display zoom percentage (relative to fit-width, so 100% means fit-to-width)
  const displayZoom = () => Math.round(scale() * 100)

  return (
    <div
      data-component="pdf-preview"
      class={`flex flex-col h-full ${props.class ?? ""}`}
    >
      {/* Toolbar */}
      <div class="flex items-center justify-between px-3 py-2 border-b border-border-weak-base bg-surface-base shrink-0">
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <Show when={totalPages() > 0}>
            <span>{totalPages()} page{totalPages() !== 1 ? "s" : ""}</span>
          </Show>
        </div>
        <div class="flex items-center gap-1">
          <button
            onClick={zoomOut}
            class="p-1.5 rounded hover:bg-surface-raised-base-hover text-text-muted hover:text-text-base transition-colors"
            title="Zoom out"
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="14" y2="14" />
              <line x1="5" y1="7" x2="9" y2="7" />
            </svg>
          </button>
          <button
            onClick={resetZoom}
            class="px-2 py-1 text-xs rounded hover:bg-surface-raised-base-hover text-text-muted hover:text-text-base transition-colors min-w-[48px]"
            title="Reset to fit width"
          >
            {displayZoom()}%
          </button>
          <button
            onClick={zoomIn}
            class="p-1.5 rounded hover:bg-surface-raised-base-hover text-text-muted hover:text-text-base transition-colors"
            title="Zoom in"
          >
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="7" cy="7" r="5" />
              <line x1="11" y1="11" x2="14" y2="14" />
              <line x1="5" y1="7" x2="9" y2="7" />
              <line x1="7" y1="5" x2="7" y2="9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div
        ref={containerRef}
        class="flex-1 overflow-auto min-h-0"
      >
        {/* Loading state */}
        <Show when={loading()}>
          <div class="flex items-center justify-center h-full p-4">
            <div class="flex items-center gap-2 text-text-muted">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 16 16" fill="none">
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
              <span class="text-sm">Loading PDF...</span>
            </div>
          </div>
        </Show>

        {/* Error state */}
        <Show when={!loading() && error()}>
          <div class="flex flex-col items-center justify-center h-full p-4 text-center">
            <svg
              class="w-12 h-12 mb-3 text-text-muted"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="12" y1="9" x2="12.01" y2="9" />
            </svg>
            <span class="text-sm font-medium text-text-base mb-1">Unable to preview PDF</span>
            <p class="text-xs text-text-muted max-w-xs">{error()}</p>
          </div>
        </Show>

        {/* PDF pages */}
        <Show when={!loading() && !error() && pageCanvases().length > 0}>
          <div class="flex flex-col items-center gap-4 p-4">
            <For each={pageCanvases()}>
              {(canvas, index) => (
                <div
                  class="shadow-lg bg-white"
                  ref={(el) => {
                    if (el && canvas.parentElement !== el) {
                      el.appendChild(canvas)
                    }
                  }}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  )
}
