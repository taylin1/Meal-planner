import LoginPage from "./Pages/LoginPage"
import SignUpPage from "./Pages/SignUpPage"
import { BrowserRouter, Navigate, Routes, Route} from 'react-router-dom'
import ProtectedRoute from "./Components/ProtectedRoute"
import Dashboard from "./Pages/Dashboard"
import Footer from "./Components/Footer"

function App() {

  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignUpPage/>}/>
      <Route path="/dashboard" element={<ProtectedRoute>{<Dashboard/>}</ProtectedRoute>}/>
    </Routes>
    <Footer/>
    </BrowserRouter>
   
    </>
  )
}

export default App
