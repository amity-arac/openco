import { createEffect, createMemo, onCleanup, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Portal } from "solid-js/web"
import { useParams } from "@solidjs/router"
import { useLayout } from "@/context/layout"
import { useCommand } from "@/context/command"
// import { useServer } from "@/context/server"
// import { useDialog } from "@opencode-ai/ui/context/dialog"
import { usePlatform } from "@/context/platform"
import { useSync } from "@/context/sync"
import { useGlobalSDK } from "@/context/global-sdk"
import { getFilename } from "@opencode-ai/util/path"
import { base64Decode } from "@opencode-ai/util/encode"

import { Icon } from "@opencode-ai/ui/icon"
import { IconButton } from "@opencode-ai/ui/icon-button"
import { Button } from "@opencode-ai/ui/button"
import { Tooltip, TooltipKeybind } from "@opencode-ai/ui/tooltip"
import { Popover } from "@opencode-ai/ui/popover"
import { TextField } from "@opencode-ai/ui/text-field"
import { Keybind } from "@opencode-ai/ui/keybind"

export function SessionHeader() {
  const globalSDK = useGlobalSDK()
  const layout = useLayout()
  const params = useParams()
  const command = useCommand()
  // const server = useServer()
  // const dialog = useDialog()
  const sync = useSync()
  const platform = usePlatform()

  const projectDirectory = createMemo(() => base64Decode(params.dir ?? ""))
  const project = createMemo(() => {
    const directory = projectDirectory()
    if (!directory) return
    return layout.projects.list().find((p) => p.worktree === directory || p.sandboxes?.includes(directory))
  })
  const name = createMemo(() => {
    const current = project()
    if (current) return current.name || getFilename(current.worktree)
    return getFilename(projectDirectory())
  })
  const hotkey = createMemo(() => command.keybind("file.open"))

  const currentSession = createMemo(() => sync.data.session.find((s) => s.id === params.id))
  const shareEnabled = createMemo(() => sync.data.config.share !== "disabled")
  const sessionKey = createMemo(() => `${params.dir}${params.id ? "/" + params.id : ""}`)
  const view = createMemo(() => layout.view(sessionKey()))

  const [state, setState] = createStore({
    share: false,
    unshare: false,
    copied: false,
    timer: undefined as number | undefined,
  })
  const shareUrl = createMemo(() => currentSession()?.share?.url)

  createEffect(() => {
    const url = shareUrl()
    if (url) return
    if (state.timer) window.clearTimeout(state.timer)
    setState({ copied: false, timer: undefined })
  })

  onCleanup(() => {
    if (state.timer) window.clearTimeout(state.timer)
  })

  function shareSession() {
    const session = currentSession()
    if (!session || state.share) return
    setState("share", true)
    globalSDK.client.session
      .share({ sessionID: session.id, directory: projectDirectory() })
      .catch((error) => {
        console.error("Failed to share session", error)
      })
      .finally(() => {
        setState("share", false)
      })
  }

  function unshareSession() {
    const session = currentSession()
    if (!session || state.unshare) return
    setState("unshare", true)
    globalSDK.client.session
      .unshare({ sessionID: session.id, directory: projectDirectory() })
      .catch((error) => {
        console.error("Failed to unshare session", error)
      })
      .finally(() => {
        setState("unshare", false)
      })
  }

  function copyLink() {
    const url = shareUrl()
    if (!url) return
    navigator.clipboard
      .writeText(url)
      .then(() => {
        if (state.timer) window.clearTimeout(state.timer)
        setState("copied", true)
        const timer = window.setTimeout(() => {
          setState("copied", false)
          setState("timer", undefined)
        }, 3000)
        setState("timer", timer)
      })
      .catch((error) => {
        console.error("Failed to copy share link", error)
      })
  }

  function viewShare() {
    const url = shareUrl()
    if (!url) return
    platform.openLink(url)
  }

  const centerMount = createMemo(() => document.getElementById("opencode-titlebar-center"))
  const rightMount = createMemo(() => document.getElementById("opencode-titlebar-right"))

  return (
    <>
      <Show when={centerMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <button
              type="button"
              class="hidden md:flex w-[320px] p-1 pl-1.5 items-center gap-2 justify-between rounded-md border border-border-weak-base bg-surface-raised-base transition-colors cursor-default hover:bg-surface-raised-base-hover focus:bg-surface-raised-base-hover active:bg-surface-raised-base-active"
              onClick={() => command.trigger("file.open")}
            >
              <div class="flex min-w-0 flex-1 items-center gap-2 overflow-visible">
                <Icon name="magnifying-glass" size="normal" class="icon-base shrink-0" />
                <span class="flex-1 min-w-0 text-14-regular text-text-weak truncate h-4.5 flex items-center">
                  Search {name()}
                </span>
              </div>

              <Show when={hotkey()}>{(keybind) => <Keybind class="shrink-0">{keybind()}</Keybind>}</Show>
            </button>
          </Portal>
        )}
      </Show>
      <Show when={rightMount()}>
        {(mount) => (
          <Portal mount={mount()}>
            <div class="flex items-center gap-3">
              {/* <div class="hidden md:flex items-center gap-1"> */}
              {/*   <Button */}
              {/*     size="small" */}
              {/*     variant="ghost" */}
              {/*     onClick={() => { */}
              {/*       dialog.show(() => <DialogSelectServer />) */}
              {/*     }} */}
              {/*   > */}
              {/*     <div */}
              {/*       classList={{ */}
              {/*         "size-1.5 rounded-full": true, */}
              {/*         "bg-icon-success-base": server.healthy() === true, */}
              {/*         "bg-icon-critical-base": server.healthy() === false, */}
              {/*         "bg-border-weak-base": server.healthy() === undefined, */}
              {/*       }} */}
              {/*     /> */}
              {/*     <Icon name="server" size="small" class="text-icon-weak" /> */}
              {/*     <span class="text-12-regular text-text-weak truncate max-w-[200px]">{server.name}</span> */}
              {/*   </Button> */}
              {/*   <SessionLspIndicator /> */}
              {/*   <SessionMcpIndicator /> */}
              {/* </div> */}
              <div class="flex items-center gap-1">
                <TooltipKeybind
                  class="hidden md:block shrink-0"
                  title="Toggle file explorer"
                  keybind={command.keybind("files.toggle")}
                >
                  <Button
                    variant="ghost"
                    class="group/files-toggle size-6 p-0"
                    onClick={() => layout.workspaceSidebar.toggle()}
                  >
                    <div class="relative flex items-center justify-center size-4 [&>*]:absolute [&>*]:inset-0">
                      <Icon
                        name={layout.workspaceSidebar.opened() ? "layout-right" : "layout-left"}
                        size="small"
                        class="group-hover/files-toggle:hidden"
                      />
                      <Icon
                        name={layout.workspaceSidebar.opened() ? "layout-right-partial" : "layout-left-partial"}
                        size="small"
                        class="hidden group-hover/files-toggle:inline-block"
                      />
                      <Icon
                        name={layout.workspaceSidebar.opened() ? "layout-right-full" : "layout-left-full"}
                        size="small"
                        class="hidden group-active/files-toggle:inline-block"
                      />
                    </div>
                  </Button>
                </TooltipKeybind>
              </div>
            </div>
          </Portal>
        )}
      </Show>
    </>
  )
}
