// Import our server side Supabase client
// We use this to verify the token the user sends us
const supabase = require('../lib/supabaseClient')

// verifyToken is middleware — it runs BEFORE the route handler
// Its job is to check that the incoming request comes from
// a real logged in user, not a random person hitting our API
async function verifyToken(req, res, next) {

  // Every HTTP request can carry headers — key/value pairs
  // that contain metadata about the request
  // The Authorization header is the standard place for auth tokens
  // It looks like: "Bearer eyJhbGci..."
  const authHeader = req.headers.authorization

  // If there's no Authorization header at all
  // or if it doesn't start with "Bearer "
  // reject the request immediately with a 401 Unauthorized
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  // Strip the "Bearer " prefix from the header value
  // so we're left with just the raw token string
  // "Bearer eyJhbGci..." becomes "eyJhbGci..."
  const token = authHeader.replace('Bearer ', '')

  try {
    // Hand the token to Supabase and ask:
    // "Is this token real and who does it belong to?"
    // Supabase checks the token's signature — only Supabase
    // knows the secret used to create it so it can't be faked
    const { data: { user }, error } = await supabase.auth.getUser(token)
    console.log(data);
    // If Supabase says the token is invalid or expired
    // reject the request with a 401
    // The route handler never runs
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    // Token is valid — attach the full user object to the request
    // This means every route handler after this middleware
    // can access req.user.id, req.user.email etc
    // without making another database call
    // We set the user once here and it's available everywhere downstream
    req.user = user

    // Call next() to pass control to the route handler
    // Without this the request just hangs forever
    // Think of next() as the middleware saying
    // "I'm done with my check, pass it along"
    next()

  } catch (err) {
    // Something unexpected went wrong during verification
    // Return a 401 rather than a 500 because
    // from the client's perspective this is still an auth failure
    return res.status(401).json({ error: 'Token verification failed' })
  }
}

// Export so routes can import and use it
module.exports = { verifyToken }

