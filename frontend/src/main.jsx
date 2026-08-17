import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { PantallaSitio } from './pages/PantallaSitio.jsx'

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
