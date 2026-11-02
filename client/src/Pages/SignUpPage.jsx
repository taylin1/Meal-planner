import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

function SignUpPage (){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  //Get user information from email box
  function handleEmailChange(e){
      setEmail(e.target.value)
  }
  //Get user information from password box
  function handlePasswordChange(e){
     setPassword(e.target.value)
  }
   
  // Sign Up Action once button is pressed
  async function handleSignup(){
    setErrorMessage('');
    setLoading(true);

    const {error} = await supabase.auth.signUp({email, password});

    if(error){
        setErrorMessage(error.message);
        setLoading(false);
        return
    }

    navigate("/login");
  }


    return(
       <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-1">Create an account</h1>
        <p className="text-gray-400 text-sm mb-6">Sign up to plan your meals</p>

        {errorMessage && (
          <div className="bg-red-500/10 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
            {errorMessage}
          </div>
        )}

        <div className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={handleEmailChange}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none"
          />

          <input
            type="password"
            placeholder="Min. 6 characters"
            value={password}
            onChange={handlePasswordChange}
            className="w-full bg-gray-800 text-white rounded-lg px-4 py-3 text-sm outline-none"
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-semibold rounded-lg py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUpPage;