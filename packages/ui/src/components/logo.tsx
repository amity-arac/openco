export const Mark = (props: { class?: string }) => {
  return (
    <img
      src="/icon.png"
      alt="OpenWork"
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{ display: "block" }}
    />
  )
}

export const Splash = (props: { class?: string }) => {
  return (
    <svg
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      viewBox="0 0 80 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M60 80H20V40H60V80Z" fill="var(--icon-base)" />
      <path d="M60 20H20V80H60V20ZM80 100H0V0H80V100Z" fill="var(--icon-strong-base)" />
    </svg>
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <img
      src="/logo.png"
      alt="OpenWork"
      data-component="logo"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{ display: "block" }}
    />
  )
}
