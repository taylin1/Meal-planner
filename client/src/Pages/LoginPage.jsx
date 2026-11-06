import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function LoginPage (){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  function handleEmailChange(e){
    setEmail(e.target.value)
  }

  function handlePasswordChange(e){
    setPassword(e.target.value)
  }

  async function handleLogin(){
    setErrorMessage('');
    setLoading(true);

    const {error} = await supabase.auth.signInWithPassword({email,password});

    if(error){
        setErrorMessage(error.message);
        setLoading(false);
        return
    }

    navigate("/dashboard");
  }

  return(

<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h1>
        <p className="text-gray-500 text-sm mb-6">Log in to your meal plans</p>

        {errorMessage && (
          <div className="bg-red-50 text-red-500 text-sm rounded-2xl px-4 py-3 mb-6">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            className="w-full bg-gray-100 text-gray-900 rounded-full px-5 py-3 text-sm outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500"
          />

          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={handlePasswordChange}
            className="w-full bg-gray-100 text-gray-900 rounded-full px-5 py-3 text-sm outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500"
          />

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-500 hover:text-orange-600 font-medium">Sign up</Link>
        </p>
      </div>
      </div>
  )
}

export default LoginPage;