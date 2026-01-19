export const Mark = (props: { class?: string }) => {
  return (
    <img
      src="/icon.png"
      alt="OpenCo"
      data-component="logo-mark"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{ display: "block" }}
    />
  )
}

export const Splash = (props: { class?: string }) => {
  return (
    <img
      src="/logo.png"
      alt="OpenCo"
      data-component="logo-splash"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{ display: "block" }}
    />
  )
}

export const Logo = (props: { class?: string }) => {
  return (
    <img
      src="/logo.png"
      alt="OpenCo"
      data-component="logo"
      classList={{ [props.class ?? ""]: !!props.class }}
      style={{ display: "block" }}
    />
  )
}
