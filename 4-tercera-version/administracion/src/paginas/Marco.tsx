// El marco de la página ya dentro: barra roja arriba y el menú.

import { NavLink, Outlet } from 'react-router'

import { Icono } from '../componentes'
import { useSesion } from '../usarSesion'

export function Marco() {
  const { yo, salir } = useSesion()
  return (
    <div className="marco">
      <header className="barra">
        <div className="barra-marca">
          <span className="barra-titulo">Bomberos de Ensenada</span>
          <span className="barra-sub">Administración</span>
        </div>
        <div className="barra-usuario">
          <span>
            {yo?.usuario.nombre} <small>· {yo?.usuario.matricula}</small>
          </span>
          <button className="boton-barra" onClick={() => void salir()}>
            <Icono nombre="salir" /> Salir
          </button>
        </div>
      </header>
      <nav className="menu" aria-label="Secciones">
        <NavLink to="/partes">Partes</NavLink>
        <NavLink to="/usuarios">Usuarios</NavLink>
        <NavLink to="/bitacora">Bitácora</NavLink>
        <NavLink to="/cuenta">Mi cuenta</NavLink>
      </nav>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  )
}
