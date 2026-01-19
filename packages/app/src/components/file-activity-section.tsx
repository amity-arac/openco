/**
 * File Activity Section Component
 *
 * Displays a collapsible section showing files with AI activity (Read or Edited/Created).
 * Feature: 003-file-activity-highlight
 */

import { For, Show, createMemo, createSignal } from "solid-js"
import { useFileActivity } from "@/context/file-activity"
import { useLocal, type LocalFile } from "@/context/local"
import { FileIcon } from "@opencode-ai/ui/file-icon"
import { Collapsible } from "@opencode-ai/ui/collapsible"
import { ACTIVITY_VISUAL_CONFIG, type FileActivityType } from "@/types/file-activity"

export interface FileActivitySectionProps {
  /** Section type - "referenced" shows read files, "changed" shows edited/created files */
  type: "referenced" | "changed"
  /** Currently selected file path */
  selectedPath?: string
  /** Callback when a file is clicked */
  onFileClick?: (file: LocalFile) => void
  /** Callback when a file is double-clicked (activated) */
  onFileActivate?: (file: LocalFile) => void
}

/**
 * Returns the filename from a path
 */
function getFileName(path: string): string {
  const parts = path.split("/")
  return parts[parts.length - 1] || path
}

/**
 * Tree node structure for folder hierarchy
 */
type TreeNode = {
  name: string
  path: string // Relative path
  absolutePath: string // Absolute path (for activity lookup)
  type: "file" | "directory"
  children: TreeNode[]
}

/**
 * Build a tree structure from a list of file paths
 */
function buildTree(filePaths: string[], getRelativePath: (path: string) => string): TreeNode[] {
  const root: TreeNode[] = []

  for (const absolutePath of filePaths) {
    const relativePath = getRelativePath(absolutePath)
    const parts = relativePath.split("/").filter(Boolean)

    let currentLevel = root
    let currentPath = ""

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isFile = i === parts.length - 1

      let existing = currentLevel.find((n) => n.name === part)

      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          absolutePath: isFile ? absolutePath : currentPath,
          type: isFile ? "file" : "directory",
          children: [],
        }
        currentLevel.push(existing)
      }

      if (!isFile) {
        currentLevel = existing.children
      }
    }
  }

  // Sort each level: directories first, then alphabetically
  const sortLevel = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type === "directory" && b.type === "file") return -1
      if (a.type === "file" && b.type === "directory") return 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortLevel(node.children)
      }
    }
  }

  sortLevel(root)
  return root
}

/**
 * Recursive component to render a tree node
 */
function TreeNodeItem(props: {
  node: TreeNode
  level: number
  selectedPath?: string
  onFileClick?: (file: LocalFile) => void
  onFileActivate?: (file: LocalFile) => void
}) {
  const fileActivity = useFileActivity()
  const [expanded, setExpanded] = createSignal(true)

  const activity = () => props.node.type === "file" ? fileActivity.get(props.node.absolutePath) : undefined
  const activityConfig = () => activity() ? ACTIVITY_VISUAL_CONFIG[activity()!.type] : undefined
  const isSelected = () => props.selectedPath === props.node.path

  const createLocalFile = (): LocalFile => ({
    path: props.node.path,
    absolute: props.node.absolutePath,
    name: props.node.name,
    type: props.node.type,
    ignored: false,
  })

  const paddingLeft = () => `${(props.level + 1) * 12 + 8}px`

  if (props.node.type === "directory") {
    return (
      <div>
        <button
          class="py-1 px-2 w-full flex items-center gap-x-1.5 rounded-md cursor-pointer transition-all duration-150 hover:bg-surface-raised-base-hover"
          style={`padding-left: ${paddingLeft()}`}
          onClick={() => setExpanded(!expanded())}
        >
          <svg
            class="size-4 text-icon-base transition-transform"
            classList={{ "rotate-90": expanded() }}
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <path d="M6 4l4 4-4 4V4z" />
          </svg>
          <FileIcon node={createLocalFile()} class="text-icon-base size-5" />
          <span class="text-14-regular whitespace-nowrap truncate flex-1 text-left text-text-base">
            {props.node.name}
          </span>
        </button>
        <Show when={expanded()}>
          <For each={props.node.children}>
            {(child) => (
              <TreeNodeItem
                node={child}
                level={props.level + 1}
                selectedPath={props.selectedPath}
                onFileClick={props.onFileClick}
                onFileActivate={props.onFileActivate}
              />
            )}
          </For>
        </Show>
      </div>
    )
  }

  // File node
  return (
    <button
      class="py-1 px-2 w-full flex items-center gap-x-1.5 rounded-md cursor-pointer transition-all duration-150"
      classList={{
        "hover:bg-surface-raised-base-hover": !isSelected(),
        "bg-surface-interactive-base border border-border-weak-selected": isSelected(),
        [activityConfig()?.background ?? ""]: !!activity() && !isSelected(),
      }}
      style={`padding-left: ${paddingLeft()}`}
      onClick={() => props.onFileClick?.(createLocalFile())}
      onDblClick={() => props.onFileActivate?.(createLocalFile())}
      title={props.node.path}
    >
      <div class="size-4 shrink-0" />
      <FileIcon node={createLocalFile()} class="text-icon-base size-4" />
      <span
        class="text-14-regular whitespace-nowrap truncate flex-1 text-left"
        classList={{
          "text-text-base": !isSelected(),
          "text-text-strong": isSelected(),
        }}
      >
        {props.node.name}
      </span>
    </button>
  )
}

/**
 * Section showing files with specific activity types in a hierarchical tree structure.
 */
export function FileActivitySection(props: FileActivitySectionProps) {
  const fileActivity = useFileActivity()
  const local = useLocal()

  // Get files based on section type
  const files = createMemo(() => {
    const allFiles = fileActivity.getAllPaths()

    if (props.type === "referenced") {
      // Only show files that are "read" (not edited or created)
      return allFiles.filter((path) => {
        const activity = fileActivity.get(path)
        return activity?.type === "read"
      })
    } else {
      // Show files that are "edited" or "created"
      return allFiles.filter((path) => {
        const activity = fileActivity.get(path)
        return activity?.type === "edited" || activity?.type === "created"
      })
    }
  })

  // Build tree structure from files
  const tree = createMemo(() => {
    return buildTree(files(), (path) => local.file.relative(path))
  })

  const sectionTitle = () => props.type === "referenced" ? "Referenced" : "Changed"
  const sectionConfig = () => props.type === "referenced"
    ? ACTIVITY_VISUAL_CONFIG.read
    : ACTIVITY_VISUAL_CONFIG.edited

  return (
    <Show when={files().length > 0}>
      <Collapsible variant="ghost" class="w-full" defaultOpen>
        <Collapsible.Trigger>
          <div class="py-1.5 px-2 w-full flex items-center gap-x-2 cursor-pointer hover:bg-surface-raised-base-hover rounded-md">
            <Collapsible.Arrow class="text-icon-base size-4" />
            <span
              class={`size-2 rounded-full shrink-0 ${sectionConfig().badgeBackground}`}
            />
            <span class="text-12-medium text-text-base flex-1 text-left">
              {sectionTitle()}
            </span>
          </div>
        </Collapsible.Trigger>
        <Collapsible.Content>
          <div class="flex flex-col">
            <For each={tree()}>
              {(node) => (
                <TreeNodeItem
                  node={node}
                  level={0}
                  selectedPath={props.selectedPath}
                  onFileClick={props.onFileClick}
                  onFileActivate={props.onFileActivate}
                />
              )}
            </For>
          </div>
        </Collapsible.Content>
      </Collapsible>
    </Show>
  )
}
