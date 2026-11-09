import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

function Navbar({ user }) {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function getInitials(name) {
    if (!name) return '?'
    return name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  async function handleLogout(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    const { error: signOutError } = await supabase.auth.signOut()

    setLoading(false)

    if (signOutError) {
      setError(signOutError.message)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <header className="-mx-4 sm:mx-0">
      <div className="mx-auto max-w-5xl border-y border-gray-200 px-5 py-3 shadow-sm sm:rounded-2xl sm:border-x">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500">
              <span className="text-white text-lg font-semibold">M</span>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Mealify</h1>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden flex-col text-right sm:flex">
                <span className="font-semibold text-gray-900">
                  {user.user_metadata?.name || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-sm text-gray-500">{user.email}</span>
              </div>

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-white">
                <span className="text-sm font-semibold">
                  {getInitials(user.user_metadata?.name || user.email || '')}
                </span>
              </div>

              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}

              <button
                onClick={handleLogout}
                disabled={loading}
                className="rounded-full border border-orange-500 px-4 py-1.5 text-sm font-medium text-orange-500 transition-colors hover:bg-orange-500 hover:border-orange-500 hover:text-white disabled:opacity-50"
              >
                {loading ? 'Logging out...' : 'Log out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
