import { defineConfig } from 'astro/config'
import { URL } from './src/data/constants'
import tunnel from 'astro-tunnel'
import icon from 'astro-icon'
// ❌ QUITAR: import image from '@astrojs/image'
import i18n from '@astrolicious/i18n'
import sitemap from 'astro-sitemap'
import playformCompress from '@playform/compress'
import compressor from 'astro-compressor'
import react from '@astrojs/react'

export default defineConfig({
  site: URL,
  server: {
    host: true
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  },
  compressHTML: false,
  // ✅ AÑADIR configuración de imágenes nativa
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  },
  vite: {
    resolve: {
      alias: {
        '@components': '/src/components',
        '@data': '/src/data',
        '@images': '/src/images',
        '@layouts': '/src/layouts',
        '@pages': '/src/pages',
        '@scripts': '/src/scripts',
        '@styles': '/src/styles'
      }
    }
  },
  integrations: [
    tunnel(),
    icon(),
    // ❌ QUITAR: image(),
    i18n({
      defaultLocale: 'es',
      locales: ['es', 'en']
    }),
    sitemap({
      canonicalURL: URL,
      lastmod: new Date(),
      createLinkInHead: false,
      xmlns: {
        xhtml: true,
        news: false,
        video: false,
        image: false
      },
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es'
        }
      },
      serialize(item) {
        item.url = item.url.replace(/\/$/g, '')
        return item
      }
    }),
    playformCompress({
      HTML: {
        collapseBooleanAttributes: true,
        maxLineLength: 0,
        removeAttributeQuotes: false,
        removeComments: true,
        removeEmptyAttributes: true,
        removeOptionalTags: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true
      },
      JavaScript: {
        compress: {
          ecma: 2015
        },
        format: {
          comments: false,
          ecma: 2015
        },
        ecma: 2015,
        module: true
      },
      Image: false,
      SVG: false
    }),
    compressor(),
    react()
  ]
})
