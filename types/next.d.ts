// Declaraciones de tipos para Next.js
declare module 'next/image' {
  import { ComponentProps } from 'react'
  
  export interface ImageProps extends Omit<ComponentProps<'img'>, 'src' | 'srcSet' | 'ref' | 'alt' | 'width' | 'height'> {
    src: string | import('next/dist/shared/lib/get-img-props').StaticImport
    alt: string
    width?: number | `${number}` | undefined
    height?: number | `${number}` | undefined
    fill?: boolean | undefined
    sizes?: string | undefined
    quality?: number | `${number}` | undefined
    priority?: boolean | undefined
    placeholder?: 'blur' | 'empty' | `data:image/${string}` | undefined
    blurDataURL?: string | undefined
    unoptimized?: boolean | undefined
    loader?: (resolverProps: import('next/dist/shared/lib/get-img-props').ImageLoaderProps) => string | undefined
    onLoad?: ((event: import('react').SyntheticEvent<HTMLImageElement, Event>) => void) | undefined
    onError?: ((event: import('react').SyntheticEvent<HTMLImageElement, Event>) => void) | undefined
  }
  
  declare const Image: import('react').ForwardRefExoticComponent<ImageProps & import('react').RefAttributes<HTMLImageElement>>
  export default Image
}

declare module 'next/navigation' {
  export function useRouter(): {
    push: (href: string, options?: { scroll?: boolean }) => void
    replace: (href: string, options?: { scroll?: boolean }) => void
    refresh: () => void
    prefetch: (href: string) => void
    back: () => void
    forward: () => void
  }
  
  export function usePathname(): string
  
  export function useSearchParams(): URLSearchParams
  
  export function useParams(): { [key: string]: string | string[] }
  
  export function redirect(url: string): never
  
  export function permanentRedirect(url: string): never
  
  export function notFound(): never
}