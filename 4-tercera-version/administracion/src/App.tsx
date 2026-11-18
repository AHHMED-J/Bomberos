// Qué se ve según la sesión:
//   sin sesión, o sólo con la contraseña   → Acceso (pide la llave de acceso)
//   con una contraseña que le dieron        → cambiarla, antes que nada
//   sesión completa                         → la página

import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { Cargando, Escudo } from './componentes'
import { Acceso } from './paginas/Acceso'
import { Bitacora } from './paginas/Bitacora'
import { FormularioContrasena } from './paginas/CambiarContrasena'
import { Marco } from './paginas/Marco'
import { MiCuenta } from './paginas/MiCuenta'
import { ParteDetalle } from './paginas/ParteDetalle'
import { Partes } from './paginas/Partes'
import { Usuarios } from './paginas/Usuarios'
import { useSesion } from './usarSesion'

export function App() {
  const { yo, cargando, recargar, salir } = useSesion()

  if (cargando) return <Cargando />
  if (!yo || yo.nivel !== 'completa') return <Acceso />
  if (yo.debe_cambiar) {
    return (
      <main className="acceso">
        <div className="acceso-tarjeta">
          <Escudo tamano={80} />
          <h1 className="titulo-seccion">Cambia tu contraseña</h1>
          <p>
            Entraste con la contraseña que te entregaron. Antes de seguir, elige una nueva que sólo tú conozcas.
          </p>
          <FormularioContrasena alTerminar={() => void recargar()} />
          <button className="boton-texto" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      </main>
    )
  }

  return (
    <BrowserRouter basename="/administracion">
      <Routes>
        <Route element={<Marco />}>
          <Route path="partes" element={<Partes />} />
          <Route path="partes/:folio" element={<ParteDetalle />} />
          <Route path="usuarios" element={<Usuarios />} />
          <Route path="bitacora" element={<Bitacora />} />
          <Route path="cuenta" element={<MiCuenta />} />
          <Route path="*" element={<Navigate to="/partes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
