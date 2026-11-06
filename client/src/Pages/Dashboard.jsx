import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../Components/Navbar'

function Dashboard() {
  const [user, setUser] = useState(null)

  useEffect(function () {
    let active = true

    async function syncUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (active) setUser(user)
    }

    syncUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      function (event, session) {
        if (event === 'INITIAL_SESSION') return
        setUser(session?.user || null)
      }
    )

    return function () {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <>
      <Navbar user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl">Welcome to the dashboard</h1>
      </main>
    </>
  )
}

export default Dashboard;