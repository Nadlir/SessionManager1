import { HashRouter, Navigate, Route, Routes } from "react-router-dom"
import { Layout } from "./components/Layout"
import { HubProvider } from "./context/HubContext"
import { PatientsPage } from "./pages/PatientsPage"
import { SessionsPage } from "./pages/SessionsPage"

export default function App() {
  return (
    <HubProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/sessions" replace />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/appointments" element={<Navigate to="/sessions" replace />} />
            <Route path="/patients" element={<PatientsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </HubProvider>
  )
}