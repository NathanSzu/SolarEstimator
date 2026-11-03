import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import PlanPage from './pages/PlanPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="plan/:id" element={<PlanPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
