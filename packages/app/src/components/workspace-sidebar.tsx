import { Show, createSignal, createEffect, on, onCleanup, createMemo } from "solid-js"
import { useLayout } from "@/context/layout"
import { useLocal, type LocalFile } from "@/context/local"
import { useFileActivity } from "@/context/file-activity"
import { useSync } from "@/context/sync"
import FileTree from "./file-tree"
import { FileActivitySection } from "./file-activity-section"
import { McpConnectorsSection } from "./mcp-connectors-section"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { getPreviewType } from "./file-preview"
import { showToast } from "@opencode-ai/ui/toast"

export interface WorkspaceSidebarProps {
  workspacePath: string
  class?: string
  onFileActivate?: (filePath: string) => void
}

// Helper function to write text files (mirrors mcp-connectors.tsx pattern)
async function writeTextFile(path: string, content: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("write_file", { path, content })
    return
  }
  throw new Error("File write not available. This feature requires the desktop app.")
}

// Helper function to create directories
async function createDirectory(path: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("create_directory", { path })
    return
  }
  throw new Error("Directory creation not available. This feature requires the desktop app.")
}

// Helper function to copy files (binary-safe, uses OS-level copy)
async function copyFile(source: string, destination: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("copy_file", { source, destination })
    return
  }
  throw new Error("File copy not available. This feature requires the desktop app.")
}

// Helper to check if Tauri is available
function isTauriAvailable(): boolean {
  return !!(window as any).__TAURI_INTERNALS__?.invoke
}

type CreateMode = "file" | "folder" | null

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const layout = useLayout()
  const local = useLocal()
  const fileActivity = useFileActivity()
  const sync = useSync()
  const [selectedFile, setSelectedFile] = createSignal<LocalFile | null>(null)
  const [createMode, setCreateMode] = createSignal<CreateMode>(null)
  const [newItemName, setNewItemName] = createSignal("")
  const [isDragOver, setIsDragOver] = createSignal(false)
  let inputRef: HTMLInputElement | undefined

  // Load root directory files when workspace path changes or component mounts
  createEffect(
    on(
      () => props.workspacePath,
      (path) => {
        if (path) {
          // Load root directory files
          local.file.loadRoot()
        }
      },
      { defer: false }
    )
  )

  // Subscribe to file activity events to refresh the file tree
  createEffect(() => {
    const unsub = fileActivity.subscribe((event) => {
      // When a file is created or edited, refresh the parent directory
      if (event.activityType === "created" || event.activityType === "edited") {
        // Get the relative path from the absolute path
        const relativePath = local.file.relative(event.path)
        const parentPath = relativePath.split("/").slice(0, -1).join("/")

        // Refresh the parent directory to show the new/updated file
        local.file.refreshDir(parentPath)
      }
    })
    onCleanup(unsub)
  })

  const handleFileClick = (file: LocalFile) => {
    setSelectedFile(file)
    // Open preview in main content area if it's a supported type
    if (file.type === "file" && getPreviewType(file.name)) {
      layout.filePreview.open(file.path)
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setSelectedFile(null)
      layout.filePreview.close()
    }
  }

  // Use empty string as root path (relative to project directory)
  const rootPath = ""

  const isEmpty = () => {
    const children = local.file.children(rootPath)
    // Filter out hidden files for the empty check
    const visibleChildren = children.filter((node) => !node.name.startsWith("."))
    return !visibleChildren || visibleChildren.length === 0
  }

  // Check if there are any activity files to show
  const hasActivityFiles = createMemo(() => {
    return fileActivity.getAllPaths().length > 0
  })

  // Get workspace directory path
  const workspaceDir = () => sync.data.path.directory

  // Handle creating new file or folder
  const handleCreate = async () => {
    const mode = createMode()
    const name = newItemName().trim()

    if (!mode || !name) {
      setCreateMode(null)
      setNewItemName("")
      return
    }

    // Validate name - no path separators allowed
    if (name.includes("/") || name.includes("\\")) {
      showToast({
        variant: "error",
        title: "Invalid name",
        description: "Name cannot contain path separators",
      })
      return
    }

    const fullPath = `${workspaceDir()}/${name}`

    try {
      if (mode === "file") {
        await writeTextFile(fullPath, "")
        showToast({
          variant: "success",
          title: "File created",
          description: name,
        })
      } else {
        await createDirectory(fullPath)
        showToast({
          variant: "success",
          title: "Folder created",
          description: name,
        })
      }

      // Refresh the root directory to show the new item
      local.file.refreshDir("")
    } catch (err) {
      showToast({
        variant: "error",
        title: `Failed to create ${mode}`,
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setCreateMode(null)
      setNewItemName("")
    }
  }

  // Handle key events in the create input
  const handleCreateKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleCreate()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setCreateMode(null)
      setNewItemName("")
    }
  }

  // Focus input when create mode changes
  createEffect(() => {
    if (createMode() && inputRef) {
      inputRef.focus()
    }
  })

  // Handle Tauri file drop events (binary-safe, uses OS-level copy)
  const handleTauriFileDrop = async (paths: string[]) => {
    if (!paths || paths.length === 0) return

    const dir = workspaceDir()
    let successCount = 0
    let errorCount = 0

    for (const sourcePath of paths) {
      try {
        // Extract filename from the source path
        const filename = sourcePath.split("/").pop() || sourcePath.split("\\").pop() || "file"
        const destPath = `${dir}/${filename}`

        // Use binary-safe copy_file command
        await copyFile(sourcePath, destPath)
        successCount++
      } catch (err) {
        console.error(`Failed to copy ${sourcePath}:`, err)
        errorCount++
      }
    }

    // Refresh the root directory
    local.file.refreshDir("")

    if (successCount > 0) {
      showToast({
        variant: "success",
        title: `${successCount} file${successCount > 1 ? "s" : ""} added`,
        description: errorCount > 0 ? `${errorCount} failed` : undefined,
      })
    } else if (errorCount > 0) {
      showToast({
        variant: "error",
        title: "Failed to add files",
        description: `${errorCount} file${errorCount > 1 ? "s" : ""} could not be copied`,
      })
    }
  }

  // Subscribe to Tauri file drop events using global Tauri API
  // DragDropEvent payload type from Tauri v2
  type DragDropPayload =
    | { type: "enter"; paths: string[]; position: { x: number; y: number } }
    | { type: "over"; position: { x: number; y: number } }
    | { type: "drop"; paths: string[]; position: { x: number; y: number } }
    | { type: "leave" }

  createEffect(() => {
    if (!isTauriAvailable()) return

    // Access the global Tauri event API (available via withGlobalTauri: true)
    const tauriEvent = (window as any).__TAURI__?.event
    if (!tauriEvent?.listen) {
      console.warn("Tauri event API not available")
      return
    }

    // Store unlisten functions to clean up later
    const unlistenFns: Array<() => void> = []

    // Set up async listeners
    const setupListeners = async () => {
      try {
        // Listen to drag-drop event (fires when files are dropped)
        const unlistenDrop = await tauriEvent.listen(
          "tauri://drag-drop",
          (event: { payload: DragDropPayload }) => {
            const payload = event.payload
            if (payload.type === "drop" && "paths" in payload && payload.paths) {
              handleTauriFileDrop(payload.paths)
            }
            setIsDragOver(false)
          }
        )
        unlistenFns.push(unlistenDrop)

        // Listen to drag-enter event (for visual feedback when entering)
        const unlistenDragEnter = await tauriEvent.listen(
          "tauri://drag-enter",
          (event: { payload: DragDropPayload }) => {
            const payload = event.payload
            if (payload.type === "enter") {
              setIsDragOver(true)
            }
          }
        )
        unlistenFns.push(unlistenDragEnter)

        // Listen to drag-leave event
        const unlistenDragLeave = await tauriEvent.listen(
          "tauri://drag-leave",
          (event: { payload: DragDropPayload }) => {
            const payload = event.payload
            if (payload.type === "leave") {
              setIsDragOver(false)
            }
          }
        )
        unlistenFns.push(unlistenDragLeave)
      } catch (err) {
        console.error("Failed to set up drag-drop listeners:", err)
      }
    }

    setupListeners()

    onCleanup(() => {
      unlistenFns.forEach((fn) => fn())
    })
  })

  // Prevent default browser drag behavior (to avoid opening files in browser)
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      class={`flex flex-col border-l border-border-weak-base glass-sidebar ${props.class ?? ""}`}
      classList={{ "ring-2 ring-inset ring-border-info-base": isDragOver() }}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="tree"
      aria-label="Workspace files"
    >
      {/* Header - h-12 to match main header */}
      <div class="h-12 px-3 border-b border-border-weak-base flex items-center justify-between shrink-0 vibrancy">
        <span class="text-12-medium text-text-base font-medium">Files</span>
        <div class="flex items-center gap-1">
          <IconButton
            icon="plus-small"
            size="normal"
            variant="ghost"
            onClick={() => {
              setCreateMode("file")
              setNewItemName("")
            }}
            aria-label="New file"
          />
          <IconButton
            icon="folder-add-left"
            size="normal"
            variant="ghost"
            onClick={() => {
              setCreateMode("folder")
              setNewItemName("")
            }}
            aria-label="New folder"
          />
          <IconButton
            icon="refresh"
            size="normal"
            variant="ghost"
            onClick={async () => {
              await local.file.refreshDir("")
              // After refresh, validate activity files against actual file system
              const existingPaths = new Set(local.file.getAllPaths())
              fileActivity.validateFiles(existingPaths, local.file.relative)
            }}
            aria-label="Refresh file list"
          />
          <IconButton
            icon="close"
            size="normal"
            variant="ghost"
            onClick={() => layout.workspaceSidebar.close()}
            aria-label="Close workspace files"
          />
        </div>
      </div>

      {/* File Tree Content */}
      <div class="flex-1 overflow-y-auto min-h-0">
        {/* Create new file/folder input */}
        <Show when={createMode()}>
          <div class="px-2 py-2 border-b border-border-weak-base">
            <div class="flex items-center gap-2">
              <span class="text-12-regular text-text-muted shrink-0">
                {createMode() === "file" ? "New file:" : "New folder:"}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={newItemName()}
                onInput={(e) => setNewItemName(e.currentTarget.value)}
                onKeyDown={handleCreateKeyDown}
                onBlur={handleCreate}
                placeholder={createMode() === "file" ? "filename.txt" : "folder-name"}
                class="flex-1 min-w-0 px-2 py-1 text-14-regular bg-surface-base border border-border-base rounded-md focus:outline-none focus:border-border-info-base"
              />
            </div>
          </div>
        </Show>

        {/* Activity Sections - Show changed and referenced files */}
        <Show when={hasActivityFiles()}>
          <div class="py-2 px-1 border-b border-border-weak-base">
            <FileActivitySection
              type="changed"
              selectedPath={selectedFile()?.path}
              onFileClick={handleFileClick}
              onFileActivate={(file) => props.onFileActivate?.(file.path)}
            />
            <FileActivitySection
              type="referenced"
              selectedPath={selectedFile()?.path}
              onFileClick={handleFileClick}
              onFileActivate={(file) => props.onFileActivate?.(file.path)}
            />
          </div>
        </Show>

        {/* Full File Tree */}
        <Show
          when={!isEmpty()}
          fallback={
            <div class="p-4 text-center text-text-muted text-sm">
              No files in workspace
            </div>
          }
        >
          <FileTree
            path={rootPath}
            workspacePath={props.workspacePath}
            selectedPath={selectedFile()?.path}
            hideActivityFiles={hasActivityFiles()}
            onFileClick={handleFileClick}
            onFileActivate={(file) => props.onFileActivate?.(file.path)}
            class="py-2 px-1"
          />
        </Show>
      </div>

      {/* MCP Connectors Section - Hidden for now */}
      {/* <McpConnectorsSection /> */}
    </div>
  )
}
