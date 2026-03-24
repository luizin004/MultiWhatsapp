'use client'

import { useEffect, useState } from 'react'
import { Package } from 'lucide-react'
import { listCatalog } from '@/services/uazapi/instance'

interface CatalogViewerProps {
  instanceToken: string
  ownerJid?: string
}

interface CatalogProduct {
  id?: string
  name?: string
  price?: number | string
  description?: string
  image?: string
  thumbnail?: string
  availability?: string
  currency?: string
}

function formatPrice(price: number | string | undefined, currency?: string): string {
  if (price === undefined || price === null || price === '') return ''
  const numeric = typeof price === 'string' ? parseFloat(price) : price
  if (isNaN(numeric)) return String(price)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(numeric)
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const thumb = product.thumbnail ?? product.image ?? null
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111B21]">
      <div className="flex h-32 items-center justify-center bg-[#0B141A]">
        {thumb ? (
          <img
            src={thumb}
            alt={product.name ?? 'Produto'}
            className="h-full w-full object-cover"
          />
        ) : (
          <Package className="h-10 w-10 text-[#8696A0]" />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-medium text-[#E9EDEF]">
          {product.name ?? 'Produto sem nome'}
        </p>
        {product.description && (
          <p className="line-clamp-2 text-xs text-[#8696A0]">{product.description}</p>
        )}
        {(product.price !== undefined && product.price !== '') && (
          <p className="mt-auto pt-1 text-sm font-semibold text-[#25D366]">
            {formatPrice(product.price, product.currency)}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CatalogViewer({ instanceToken, ownerJid }: CatalogViewerProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchCatalog() {
      setLoading(true)
      setFetchError(null)
      try {
        const result = await listCatalog(instanceToken, { jid: ownerJid ?? '' })
        if (!cancelled) {
          const items = Array.isArray(result)
            ? result
            : ((result as Record<string, unknown>)?.products as CatalogProduct[]) ?? []
          setProducts(items as CatalogProduct[])
        }
      } catch {
        if (!cancelled) setFetchError('Não foi possível carregar o catálogo.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchCatalog()
    return () => { cancelled = true }
  }, [instanceToken, ownerJid])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-sm text-[#f7a8a2]">{fetchError}</p>
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <Package className="h-10 w-10 text-[#8696A0]" />
        <p className="text-sm text-[#8696A0]">Nenhum produto no catálogo</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product, index) => (
        <ProductCard key={product.id ?? index} product={product} />
      ))}
    </div>
  )
}
