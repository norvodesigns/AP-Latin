package com.norvodesigns.lectio.data

/**
 * Where the app's services live. Nothing here is secret: the Supabase anon key
 * is designed to be public (row-level security in the database is what
 * protects student data) and is already served to every visitor of the
 * website. The AI provider keys never leave the web server; the app calls the
 * website's /api/ai routes instead.
 */
object AppConfig {
    const val webBaseUrl = "https://lectio.norvodesigns.com"

    const val supabaseUrl = "https://sxohsxjfrlfziuxvlqvi.supabase.co"
    const val supabaseAnonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4b2hzeGpmcmxmeml1eHZscXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjQyNTYsImV4cCI6MjEwMzk0MDI1Nn0.vx--PDSSOV3dCoPFABBS2uAalolZ35OT-DenjZ2QrXg"

    /** Where Supabase sends a signup-confirmation link back to (a URL scheme in the manifest, and a redirect URL in Supabase). */
    const val authCallbackUrl = "lectio://auth-callback"

    /** A page on the website (the privacy policy, support, teaching tools). */
    fun web(path: String): String = "$webBaseUrl/${path.trimStart('/')}"

    /** The College Board's own wording, wherever its trademark is named. */
    const val trademarkNotice =
        "AP® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, this product."
}
