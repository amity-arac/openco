import { useLocal, type LocalFile } from "@/context/local"
import { useFileActivity } from "@/context/file-activity"
import { useSync } from "@/context/sync"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { Tooltip } from "@opencode-ai/ui/tooltip"
import { ContextMenu } from "@opencode-ai/ui/context-menu"
import { showToast } from "@opencode-ai/ui/toast"
import { createMemo, createSignal, For, Match, Show, Switch, type ComponentProps, type ParentProps } from "solid-js"
import { Dynamic } from "solid-js/web"
import { ACTIVITY_VISUAL_CONFIG } from "@/types/file-activity"

// Helper functions for file operations
async function renamePath(source: string, destination: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("rename_path", { source, destination })
    return
  }
  throw new Error("Rename not available. This feature requires the desktop app.")
}

async function deletePath(path: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("delete_path", { path })
    return
  }
  throw new Error("Delete not available. This feature requires the desktop app.")
}

async function movePath(source: string, destination: string): Promise<void> {
  const tauriInvoke = (window as any).__TAURI_INTERNALS__?.invoke
  if (tauriInvoke) {
    await tauriInvoke("move_path", { source, destination })
    return
  }
  throw new Error("Move not available. This feature requires the desktop app.")
}

export default function FileTree(props: {
  path: string
  class?: string
  nodeClass?: string
  level?: number
  selectedPath?: string
  workspacePath?: string
  showHidden?: boolean
  hideActivityFiles?: boolean
  onFileClick?: (file: LocalFile) => void
  onFileActivate?: (file: LocalFile) => void
}) {
  const local = useLocal()
  const fileActivity = useFileActivity()
  const sync = useSync()
  const level = props.level ?? 0
  const rootPath = props.workspacePath ?? props.path
  const showHidden = props.showHidden ?? false
  const hideActivityFiles = props.hideActivityFiles ?? false

  // State for renaming
  const [renamingPath, setRenamingPath] = createSignal<string | null>(null)
  const [renameValue, setRenameValue] = createSignal("")

  // Get workspace directory path
  const workspaceDir = () => sync.data.path.directory

  // Get children and filter out hidden files unless showHidden is true
  // Also filter out files with activity if hideActivityFiles is true
  const children = createMemo(() => {
    const allChildren = local.file.children(props.path)
    return allChildren.filter((node) => {
      // Filter hidden files
      if (!showHidden && node.name.startsWith(".")) return false
      // Filter activity files (only for files, not directories)
      // Check both absolute path and relative path to handle different path formats
      if (hideActivityFiles && node.type === "file") {
        if (fileActivity.has(node.absolute) || fileActivity.has(node.path)) {
          return false
        }
      }
      return true
    })
  })

  // Sort children: directories first, then files, alphabetically within each group
  const sortedChildren = createMemo(() => {
    return [...children()].sort((a, b) => {
      // Directories first
      if (a.type === "directory" && b.type !== "directory") return -1
      if (a.type !== "directory" && b.type === "directory") return 1
      // Alphabetical within same type
      return a.name.localeCompare(b.name)
    })
  })

  const getRelativePath = (absolutePath: string) => {
    if (absolutePath.startsWith(rootPath)) {
      const relative = absolutePath.slice(rootPath.length)
      return relative.startsWith("/") ? relative.slice(1) : relative
    }
    return absolutePath
  }

  // Handle rename
  const startRename = (node: LocalFile) => {
    setRenamingPath(node.path)
    setRenameValue(node.name)
  }

  const commitRename = async (node: LocalFile) => {
    const newName = renameValue().trim()
    if (!newName || newName === node.name) {
      setRenamingPath(null)
      setRenameValue("")
      return
    }

    // Validate name
    if (newName.includes("/") || newName.includes("\\")) {
      showToast({
        variant: "error",
        title: "Invalid name",
        description: "Name cannot contain path separators",
      })
      return
    }

    const parentPath = node.absolute.split("/").slice(0, -1).join("/")
    const newPath = `${parentPath}/${newName}`

    try {
      await renamePath(node.absolute, newPath)
      showToast({
        variant: "success",
        title: "Renamed",
        description: `${node.name} → ${newName}`,
      })
      // Refresh parent directory
      const relativeParent = node.path.split("/").slice(0, -1).join("/")
      local.file.refreshDir(relativeParent)
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to rename",
        description: err instanceof Error ? err.message : "Unknown error",
      })
    } finally {
      setRenamingPath(null)
      setRenameValue("")
    }
  }

  const cancelRename = () => {
    setRenamingPath(null)
    setRenameValue("")
  }

  // Handle delete
  const handleDelete = async (node: LocalFile) => {
    const confirmed = window.confirm(`Delete "${node.name}"? This cannot be undone.`)
    if (!confirmed) return

    try {
      await deletePath(node.absolute)
      // Remove from store immediately so UI updates
      local.file.remove(node.path)
      showToast({
        variant: "success",
        title: "Deleted",
        description: node.name,
      })
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to delete",
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  // Handle drop on directory
  const handleDrop = async (targetDir: LocalFile, e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const data = e.dataTransfer?.getData("text/plain")
    if (!data?.startsWith("file:")) return

    const sourcePath = data.slice(5) // Remove "file:" prefix
    const sourceAbsolute = `${workspaceDir()}/${sourcePath}`
    const sourceName = sourcePath.split("/").pop()!
    const destPath = `${targetDir.absolute}/${sourceName}`

    // Don't drop on itself or its own parent
    if (sourceAbsolute === destPath || sourceAbsolute === targetDir.absolute) return
    // Don't move a directory into its own child
    if (targetDir.absolute.startsWith(sourceAbsolute + "/")) {
      showToast({
        variant: "error",
        title: "Cannot move",
        description: "Cannot move a folder into itself",
      })
      return
    }

    try {
      await movePath(sourceAbsolute, destPath)
      // Remove source from store immediately so UI updates
      local.file.remove(sourcePath)
      // Refresh target directory to show the moved file
      local.file.refreshDir(targetDir.path)
      showToast({
        variant: "success",
        title: "Moved",
        description: `${sourceName} → ${targetDir.name}/`,
      })
    } catch (err) {
      showToast({
        variant: "error",
        title: "Failed to move",
        description: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  const Node = (p: ParentProps & ComponentProps<"div"> & { node: LocalFile; as?: "div" | "button" }) => {
    // T017: Get activity state for this node (use absolute path since tool events send absolute paths)
    const activity = () => fileActivity.get(p.node.absolute)
    // T029/T030: Get directory activity for collapsed directories
    const directoryActivity = () => p.node.type === "directory" ? fileActivity.getDirectoryActivity(p.node.absolute) : undefined
    // Combined activity (file's own or directory's aggregated)
    const nodeActivity = () => activity() ?? (directoryActivity() ? { type: directoryActivity()! } : undefined)
    const activityConfig = () => nodeActivity() ? ACTIVITY_VISUAL_CONFIG[nodeActivity()!.type] : undefined

    const [isDragOver, setIsDragOver] = createSignal(false)
    const isRenaming = () => renamingPath() === p.node.path

    return (
      <Dynamic
        component={p.as ?? "div"}
        classList={{
          "py-1 px-2 w-full flex items-center gap-x-1.5 rounded-md cursor-pointer transition-all duration-150": true,
          "hover:bg-surface-raised-base-hover": props.selectedPath !== p.node.path && !nodeActivity() && !isDragOver(),
          "bg-surface-interactive-base border border-border-weak-selected": props.selectedPath === p.node.path,
          "ring-2 ring-inset ring-border-info-base": isDragOver(),
          // Activity-specific backgrounds (only when not selected)
          [activityConfig()?.background ?? ""]: !!nodeActivity() && props.selectedPath !== p.node.path,
          [activityConfig()?.border ?? ""]: !!nodeActivity() && props.selectedPath !== p.node.path,
          [props.nodeClass ?? ""]: !!props.nodeClass,
        }}
        style={`padding-left: ${level * 12 + 8}px`}
        draggable={!isRenaming()}
        onDragStart={(e: any) => {
          if (isRenaming()) return
          const evt = e as globalThis.DragEvent
          evt.dataTransfer!.effectAllowed = "move"
          evt.dataTransfer!.setData("text/plain", `file:${p.node.path}`)

          // Create custom drag image without margins
          const dragImage = document.createElement("div")
          dragImage.className =
            "flex items-center gap-x-2 px-2 py-1 bg-background-element rounded-md border border-border-1"
          dragImage.style.position = "absolute"
          dragImage.style.top = "-1000px"

          // Copy only the icon and text content without padding
          const icon = e.currentTarget.querySelector("svg")
          const text = e.currentTarget.querySelector("span")
          if (icon && text) {
            dragImage.innerHTML = icon.outerHTML + text.outerHTML
          }

          document.body.appendChild(dragImage)
          evt.dataTransfer!.setDragImage(dragImage, 0, 12)
          setTimeout(() => document.body.removeChild(dragImage), 0)
        }}
        onDragOver={(e: DragEvent) => {
          if (p.node.type !== "directory") return
          const data = e.dataTransfer?.types.includes("text/plain")
          if (data) {
            e.preventDefault()
            e.stopPropagation()
            e.dataTransfer!.dropEffect = "move"
            setIsDragOver(true)
          }
        }}
        onDragLeave={(e: DragEvent) => {
          e.preventDefault()
          setIsDragOver(false)
        }}
        onDrop={(e: DragEvent) => {
          setIsDragOver(false)
          if (p.node.type === "directory") {
            handleDrop(p.node, e)
          }
        }}
        {...p}
      >
        {p.children}
        <Show
          when={!isRenaming()}
          fallback={
            <input
              type="text"
              value={renameValue()}
              onInput={(e) => setRenameValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitRename(p.node)
                } else if (e.key === "Escape") {
                  e.preventDefault()
                  cancelRename()
                }
              }}
              onBlur={() => commitRename(p.node)}
              autofocus
              class="flex-1 min-w-0 px-1 py-0 text-14-regular bg-surface-base border border-border-info-base rounded focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          }
        >
          <span
            classList={{
              "text-14-regular whitespace-nowrap truncate flex-1 text-left": true,
              "text-text-subtle": p.node.ignored && props.selectedPath !== p.node.path,
              "text-text-base": !p.node.ignored && props.selectedPath !== p.node.path,
              "text-text-strong": props.selectedPath === p.node.path,
            }}
          >
            {p.node.name}
          </span>
        </Show>
      </Dynamic>
    )
  }

  return (
    <div class={`flex flex-col ${props.class ?? ""}`} role="group">
      <For each={sortedChildren()}>
        {(node) => {
          const relativePath = getRelativePath(node.path)
          // Don't show tooltip if it's just the filename (no additional info)
          const showTooltip = relativePath !== node.name && relativePath.length > 0
          return (
            <ContextMenu>
              <ContextMenu.Trigger class="w-full">
                <Tooltip forceMount={false} openDelay={1000} value={relativePath} placement="right" inactive={!showTooltip}>
                  <Switch>
                    <Match when={node.type === "directory"}>
                      <div role="treeitem">
                        <Collapsible
                          variant="ghost"
                          class="w-full"
                          forceMount={false}
                          onOpenChange={(open) => (open ? local.file.expand(node.path) : local.file.collapse(node.path))}
                        >
                          <Collapsible.Trigger>
                            <Node node={node}>
                              <Collapsible.Arrow class="text-icon-base size-4" />
                              <FileIcon node={node} class="text-icon-base size-5" />
                            </Node>
                          </Collapsible.Trigger>
                          <Collapsible.Content>
                            <FileTree
                              path={node.path}
                              level={level + 1}
                              selectedPath={props.selectedPath}
                              workspacePath={rootPath}
                              showHidden={showHidden}
                              hideActivityFiles={hideActivityFiles}
                              onFileClick={props.onFileClick}
                              onFileActivate={props.onFileActivate}
                            />
                          </Collapsible.Content>
                        </Collapsible>
                      </div>
                    </Match>
                    <Match when={node.type === "file"}>
                      <Node
                        node={node}
                        as="button"
                        role="treeitem"
                        aria-selected={props.selectedPath === node.path}
                        onClick={() => props.onFileClick?.(node)}
                        onDblClick={() => props.onFileActivate?.(node)}
                      >
                        <div class="size-4 shrink-0" />
                        <FileIcon node={node} class="text-icon-base size-4" />
                      </Node>
                    </Match>
                  </Switch>
                </Tooltip>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content>
                  <ContextMenu.Item onSelect={() => startRename(node)}>
                    Rename
                  </ContextMenu.Item>
                  <ContextMenu.Separator />
                  <ContextMenu.Item onSelect={() => handleDelete(node)} data-destructive="true">
                    Delete
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu>
          )
        }}
      </For>
    </div>
  )
}
