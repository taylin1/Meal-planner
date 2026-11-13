function DisplayAnswer({ answer, loading, error }) {
  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-100 rounded w-full" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-3xl p-6 shadow-sm">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (answer) {
    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        <p className="text-sm text-gray-900 leading-relaxed">{answer}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <p className="text-gray-500 text-sm">Your answer will appear here.</p>
    </div>
  )
}

export default DisplayAnswer
