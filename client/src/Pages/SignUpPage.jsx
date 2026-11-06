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
       <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create an account</h1>
        <p className="text-gray-500 text-sm mb-6">Sign up to plan your meals</p>

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
            placeholder="Min. 6 characters"
            value={password}
            onChange={handlePasswordChange}
            className="w-full bg-gray-100 text-gray-900 rounded-full px-5 py-3 text-sm outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-orange-500"
          />

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full py-3 text-sm disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUpPage;