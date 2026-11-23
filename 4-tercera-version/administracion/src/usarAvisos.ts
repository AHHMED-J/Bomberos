import { useOutletContext } from 'react-router'

import type { Avisos } from './avisos'

// Los avisos que pide el marco (Marco.tsx) y comparten sus páginas.
export const useAvisos = () => useOutletContext<Avisos>()
