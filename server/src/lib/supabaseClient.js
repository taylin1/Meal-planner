// Load the Supabase client library
const { createClient } = require('@supabase/supabase-js')

// Read credentials from .env file
// These are available because index.js calls require('dotenv').config()
const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Guard clause — if either variable is missing
// throw a clear error immediately on startup
// rather than crashing later with a confusing message

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. Check your server/.env file.'
  )
}

// Create the Supabase client with the service role key
// This key bypasses Row Level Security completely
// giving Express full admin access to the database

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {

  auth: {
    // Disable automatic token refreshing
    // Token refreshing is a browser concept — when a user's
    // session expires in a browser Supabase gets a new token automatically
    // On a server there is no user session to refresh
    // the server just verifies OTHER people's tokens
    autoRefreshToken: false,

    // Disable session persistence
    // By default Supabase stores sessions in localStorage
    // localStorage is a browser feature that doesn't exist in Node.js
    // Turning this off tells Supabase not to try storing anything
    persistSession: false,
  
 }
})

module.exports = supabase;