import { Buffer } from 'buffer'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'
import App from './App.jsx'
import { PantallaSitio } from './pages/PantallaSitio.jsx'

// exceljs (usado para "Exportar reporte") se armó pensando en un bundler
// que provee `Buffer` como global (Webpack lo hacía solo; Vite no) -- sin
// esto, generar el .xlsx falla en tiempo de ejecución con "Buffer is not
// defined" aunque la build compile sin errores.
window.Buffer = window.Buffer ?? Buffer

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PantallaSitio />} />
        <Route path="/sitio/:dispositivoId" element={<PantallaSitio />} />
        <Route path="/panel" element={<App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
