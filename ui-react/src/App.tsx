import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell'
import PL from './pages/PL'
import ARR from './pages/ARR'
import ARaging from './pages/ARaging'
import Chat from './pages/Chat'
import Commentary from './pages/Commentary'
import BoardPack from './pages/BoardPack'
import Forecast from './pages/Forecast'
import Anomalies from './pages/Anomalies'

// Auth is disabled in this build — VITE_COGNITO_USER_POOL_ID is not set.
// To re-enable Cognito + IAM Identity Center SAML, restore:
//   import { configureAmplify } from './auth/AmplifyConfig'
//   import ProtectedRoute from './auth/ProtectedRoute'
//   import Login from './pages/Login'
//   configureAmplify()
// and wrap the routes in <ProtectedRoute>.

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/pl" replace />} />
          <Route path="pl"         element={<PL />} />
          <Route path="arr"        element={<ARR />} />
          <Route path="ar-aging"   element={<ARaging />} />
          <Route path="chat"       element={<Chat />} />
          <Route path="commentary" element={<Commentary />} />
          <Route path="board-pack" element={<BoardPack />} />
          <Route path="forecast"   element={<Forecast />} />
          <Route path="anomalies"  element={<Anomalies />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
