declare module '*.astro' {
  import type { ComponentType } from 'astro'
  const component: ComponentType
  export default component
}
