import Foundation

/// Where the app's services live. Nothing here is secret: the Supabase anon
/// key is designed to be public (row-level security in the database is what
/// protects student data) and is already served to every visitor of the
/// website. The AI provider keys never leave the web server — the app calls
/// the website's /api/ai routes instead.
enum AppConfig {
    static let webBaseURL = URL(string: "https://lectio.norvodesigns.com")!

    static let supabaseURL = URL(string: "https://sxohsxjfrlfziuxvlqvi.supabase.co")!
    static let supabaseAnonKey =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4b2hzeGpmcmxmeml1eHZscXZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzNjQyNTYsImV4cCI6MjEwMzk0MDI1Nn0.vx--PDSSOV3dCoPFABBS2uAalolZ35OT-DenjZ2QrXg"

    /// Where Supabase sends a signup-confirmation link back to (registered as a
    /// URL scheme in project.yml, and as a redirect URL in Supabase).
    static let authCallbackURL = URL(string: "lectio://auth-callback")!

    /// A web section's URL, for the "open on the web" fallback on sections the
    /// app doesn't have yet.
    static func web(_ path: String) -> URL { webBaseURL.appending(path: path) }
}
