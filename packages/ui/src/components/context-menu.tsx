import { ContextMenu as Kobalte } from "@kobalte/core/context-menu"
import { splitProps } from "solid-js"
import type { ComponentProps, ParentProps } from "solid-js"

export interface ContextMenuProps extends ComponentProps<typeof Kobalte> {}
export interface ContextMenuTriggerProps extends ComponentProps<typeof Kobalte.Trigger> {}
export interface ContextMenuPortalProps extends ComponentProps<typeof Kobalte.Portal> {}
export interface ContextMenuContentProps extends ComponentProps<typeof Kobalte.Content> {}
export interface ContextMenuSeparatorProps extends ComponentProps<typeof Kobalte.Separator> {}
export interface ContextMenuGroupProps extends ComponentProps<typeof Kobalte.Group> {}
export interface ContextMenuGroupLabelProps extends ComponentProps<typeof Kobalte.GroupLabel> {}
export interface ContextMenuItemProps extends ComponentProps<typeof Kobalte.Item> {}
export interface ContextMenuItemLabelProps extends ComponentProps<typeof Kobalte.ItemLabel> {}
export interface ContextMenuItemDescriptionProps extends ComponentProps<typeof Kobalte.ItemDescription> {}

function ContextMenuRoot(props: ContextMenuProps) {
  return <Kobalte {...props} data-component="context-menu" />
}

function ContextMenuTrigger(props: ParentProps<ContextMenuTriggerProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.Trigger
      {...rest}
      data-slot="context-menu-trigger"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.Trigger>
  )
}

function ContextMenuPortal(props: ContextMenuPortalProps) {
  return <Kobalte.Portal {...props} />
}

function ContextMenuContent(props: ParentProps<ContextMenuContentProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.Content
      {...rest}
      data-component="context-menu-content"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.Content>
  )
}

function ContextMenuSeparator(props: ContextMenuSeparatorProps) {
  const [local, rest] = splitProps(props, ["class", "classList"])
  return (
    <Kobalte.Separator
      {...rest}
      data-slot="context-menu-separator"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    />
  )
}

function ContextMenuGroup(props: ParentProps<ContextMenuGroupProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.Group
      {...rest}
      data-slot="context-menu-group"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.Group>
  )
}

function ContextMenuGroupLabel(props: ParentProps<ContextMenuGroupLabelProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.GroupLabel
      {...rest}
      data-slot="context-menu-group-label"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.GroupLabel>
  )
}

function ContextMenuItem(props: ParentProps<ContextMenuItemProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.Item
      {...rest}
      data-slot="context-menu-item"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.Item>
  )
}

function ContextMenuItemLabel(props: ParentProps<ContextMenuItemLabelProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.ItemLabel
      {...rest}
      data-slot="context-menu-item-label"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.ItemLabel>
  )
}

function ContextMenuItemDescription(props: ParentProps<ContextMenuItemDescriptionProps>) {
  const [local, rest] = splitProps(props, ["class", "classList", "children"])
  return (
    <Kobalte.ItemDescription
      {...rest}
      data-slot="context-menu-item-description"
      classList={{
        ...(local.classList ?? {}),
        [local.class ?? ""]: !!local.class,
      }}
    >
      {local.children}
    </Kobalte.ItemDescription>
  )
}

export const ContextMenu = Object.assign(ContextMenuRoot, {
  Trigger: ContextMenuTrigger,
  Portal: ContextMenuPortal,
  Content: ContextMenuContent,
  Separator: ContextMenuSeparator,
  Group: ContextMenuGroup,
  GroupLabel: ContextMenuGroupLabel,
  Item: ContextMenuItem,
  ItemLabel: ContextMenuItemLabel,
  ItemDescription: ContextMenuItemDescription,
})
