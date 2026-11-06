import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  // 'checking' | 'authenticated' | 'unauthenticated'
  const [status, setStatus] = useState('checking')

  useEffect(function () {
    let active = true

    // A cached session in localStorage can be expired or tampered with, so it is
    // not proof of authentication. getUser() validates it against Supabase.
    async function verifySession() {
      const { data: { user }, error } = await supabase.auth.getUser()

      if (!active) return

      setStatus(!error && user ? 'authenticated' : 'unauthenticated')
    }

    verifySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(function (event, session) {
      // The initial check is handled by verifySession() above.
      if (event === 'INITIAL_SESSION' || !active) return

      setStatus(session?.user ? 'authenticated' : 'unauthenticated')
    })

    return function () {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Don't render the dashboard (or redirect) until auth has been resolved.
  if (status === 'checking') {
    return null
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
