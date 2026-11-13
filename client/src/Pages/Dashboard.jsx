import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Navbar from '../Components/Navbar'
import PlanBuilder from '../Components/PlanBuilder'
import PlanPreview from '../Components/PlanPreview'
import SavedPlans from '../Components/SavedPlans'
import QuestionBar from '../Components/QuestionBar'
import DisplayAnswer from '../Components/DisplayAnswer'
import { fetchMealPlans, generateMealPlan, deleteMealPlan, askQuestion } from '../lib/mealPlansApi'

function Dashboard() {
  const [user, setUser] = useState(null)
  const [plans, setPlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [viewingSaved, setViewingSaved] = useState(false)
  const previewRef = useRef(null)
  const [plansLoading, setPlansLoading] = useState(true)
  const [plansError, setPlansError] = useState('')
  const [answer, setAnswer] = useState('')
  const [answerLoading, setAnswerLoading] = useState(false)
  const [answerError, setAnswerError] = useState('')
  const hideQvac = import.meta.env.VITE_HIDE_QVAC === 'true'

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

  useEffect(function () {
    let active = true

    async function loadPlans() {
      try {
        const savedPlans = await fetchMealPlans()
        if (active) setPlans(savedPlans)
      } catch (err) {
        if (active) setPlansError(err.message)
      }

      if (active) setPlansLoading(false)
    }

    loadPlans()

    return function () {
      active = false
    }
  }, [])

  // Shows the plan in the preview and brings it into view, since the preview
  // sits above the saved plans list
  function showPlan(plan, fromSavedList) {
    setSelectedPlan(plan)
    setViewingSaved(fromSavedList)

    window.requestAnimationFrame(function () {
      const preview = previewRef.current

      if (!preview) return

      preview.focus({ preventScroll: true })
      preview.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleView(plan) {
    showPlan(plan, true)
  }

  async function handleGenerate(choices) {
    const plan = await generateMealPlan(choices)

    setPlans(function (current) {
      return [plan].concat(current)
    })
    showPlan(plan, false)
  }

  async function handleDelete(id) {
    await deleteMealPlan(id)

    setPlans(function (current) {
      return current.filter(function (plan) {
        return plan.id !== id
      })
    })

    setSelectedPlan(function (current) {
      return current && current.id === id ? null : current
    })
  }

  async function handleAsk(question) {
    setAnswer('')
    setAnswerError('')
    setAnswerLoading(true)

    try {
      const result = await askQuestion(question)
      setAnswer(result.answer)
    } catch (err) {
      setAnswerError(err.message)
    } finally {
      setAnswerLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        <Navbar user={user} />

        <main className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <PlanBuilder onGenerate={handleGenerate} />
            <PlanPreview
              ref={previewRef}
              plan={selectedPlan}
              viewingSaved={Boolean(selectedPlan) && viewingSaved}
            />
          </div>

          {hideQvac ? null : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
              <QuestionBar onAsk={handleAsk} loading={answerLoading} />
              <DisplayAnswer answer={answer} loading={answerLoading} error={answerError} />
            </div>
          )}

          <SavedPlans
            plans={plans}
            loading={plansLoading}
            error={plansError}
            selectedPlanId={selectedPlan ? selectedPlan.id : ''}
            onView={handleView}
            onDelete={handleDelete}
          />
        </main>
      </div>
    </div>
  )
}

export default Dashboard;