import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Brain, Lock, Zap, BarChart3 } from "lucide-react";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Link } from "wouter";

/**
 * WOOHAN Home Page - Landing and Dashboard
 * 
 * Features:
 * - Authentication status display
 * - Memory system overview
 * - Event submission interface
 * - Identity management
 * - Learning metrics visualization
 */
export default function Home() {
  const { user, loading, error, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
          <p className="text-slate-300">Loading WOOHAN System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {APP_LOGO && <img src={APP_LOGO} alt="Logo" className="w-8 h-8" />}
            <h1 className="text-2xl font-bold text-white">{APP_TITLE}</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-slate-300">Welcome, {user?.name || "User"}</span>
                <Button
                  onClick={logout}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button
                onClick={() => window.location.href = getLoginUrl()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Login
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-5xl font-bold text-white mb-4">
              Workflow-Optimized Heuristic Adaptive Network
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              A foundational AI framework for dynamic memory, event-driven continuous learning,
              and secure identity encoding with semantic understanding.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="bg-slate-800 border-slate-700 hover:border-blue-500 transition-colors">
              <CardHeader>
                <Brain className="w-8 h-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">Dynamic Memory</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  LSTM-based memory with time-decay and event-driven updates
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 hover:border-purple-500 transition-colors">
              <CardHeader>
                <Zap className="w-8 h-8 text-purple-400 mb-2" />
                <CardTitle className="text-white">Event-Driven Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  Adaptive learning triggered only on significant events
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 hover:border-green-500 transition-colors">
              <CardHeader>
                <Lock className="w-8 h-8 text-green-400 mb-2" />
                <CardTitle className="text-white">Secure Identity</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  Privacy-preserving embeddings with differential privacy
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700 hover:border-orange-500 transition-colors">
              <CardHeader>
                <BarChart3 className="w-8 h-8 text-orange-400 mb-2" />
                <CardTitle className="text-white">Semantic Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-300 text-sm">
                  Hugging Face powered semantic understanding
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Authentication Status Section */}
        {isAuthenticated ? (
          <section className="mb-16">
            <h3 className="text-3xl font-bold text-white mb-8">Dashboard</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Memory Status Card */}
              <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Memory System Status</CardTitle>
                  <CardDescription className="text-slate-400">
                    Current state of your adaptive memory
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <span className="text-slate-300">Memory Size</span>
                      <span className="text-white font-semibold">256 dimensions</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <span className="text-slate-300">Events Processed</span>
                      <span className="text-white font-semibold">0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <span className="text-slate-300">Significant Events</span>
                      <span className="text-white font-semibold">0</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-slate-700 rounded">
                      <span className="text-slate-300">Last Update</span>
                      <span className="text-white font-semibold">Never</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions Card */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/memory">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start">
                      <Brain className="w-4 h-4 mr-2" />
                      Memory Management
                    </Button>
                  </Link>
                  <Link href="/identity">
                    <Button className="w-full bg-green-600 hover:bg-green-700 text-white justify-start">
                      <Lock className="w-4 h-4 mr-2" />
                      Identity Encoding
                    </Button>
                  </Link>
                  <Link href="/analytics">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white justify-start">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Learning Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          </section>
        ) : (
          <section className="mb-16 text-center">
            <Card className="bg-slate-800 border-slate-700 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white">Get Started with WOOHAN</CardTitle>
                <CardDescription className="text-slate-400">
                  Sign in to access your adaptive memory system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => window.location.href = getLoginUrl()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2 text-lg"
                >
                  Sign In to Continue
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Architecture Overview */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-white mb-8">System Architecture</h3>
          
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-xl font-semibold text-blue-400 mb-4">Core Components</h4>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">•</span>
                    <span><strong>Dynamic Memory Model (DMM):</strong> LSTM-based memory with time-decay</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">•</span>
                    <span><strong>Event-Driven Learning (EDCL):</strong> Adaptive learning on significant events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">•</span>
                    <span><strong>Secure Identity Encoding (SIE):</strong> Privacy-preserving embeddings</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-400 font-bold">•</span>
                    <span><strong>Hugging Face Integration:</strong> Semantic understanding</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-xl font-semibold text-purple-400 mb-4">Key Features</h4>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-3">
                    <span className="text-blue-400 font-bold">✓</span>
                    <span>Continuous learning with event-driven updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-purple-400 font-bold">✓</span>
                    <span>Differential privacy guarantees (ε, δ)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-green-400 font-bold">✓</span>
                    <span>Semantic event clustering and analysis</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-orange-400 font-bold">✓</span>
                    <span>Multi-lingual support via Hugging Face</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Documentation Links */}
        <section className="text-center mb-16">
          <h3 className="text-2xl font-bold text-white mb-6">Learn More</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <a href="https://github.com/woohan/woohan" target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <a href="/docs" target="_blank" rel="noopener noreferrer">
                Documentation
              </a>
            </Button>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <a href="/whitepaper" target="_blank" rel="noopener noreferrer">
                Technical Whitepaper
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-slate-400">
          <p>
            WOOHAN © 2025 | A Manus AI Project | 
            <a href="https://github.com" className="text-blue-400 hover:text-blue-300 ml-2">
              Open Source
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
