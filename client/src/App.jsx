import LoginPage from "./Pages/LoginPage"
import SignUpPage from "./Pages/SignUpPage"
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
function App() {

  return (
    <>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to="/login"/>}/>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/signup" element={<SignUpPage/>}/>
    </Routes>
    </BrowserRouter>
   
    </>
  )
}

export default App
