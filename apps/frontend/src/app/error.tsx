'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Error Boundary]', error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B141A] p-8 text-[#E9EDEF]">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111B21] p-8 shadow-2xl text-center">
        <h2 className="text-lg font-semibold text-red-400">Algo deu errado</h2>
        <p className="mt-3 text-sm text-[#8696A0] break-words">
          {error.message || 'Ocorreu um erro inesperado.'}
        </p>
        {error.digest && (
          <p className="mt-1 text-xs text-[#8696A0]/60">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-[#25D366] px-6 py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
