"use client"

import React, { ReactNode, ErrorInfo } from "react"

interface Props {
  children: ReactNode
  fallback?: (error: Error, reset: () => void) => ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    console.error("[ErrorBoundary] getDerivedStateFromError caught:", error)
    console.error("[ErrorBoundary] Error stack:", error.stack)
    console.error("[ErrorBoundary] Error message:", error.message)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] componentDidCatch:")
    console.error("Error:", error)
    console.error("Error Info:", errorInfo)
    console.error("Component Stack:", errorInfo.componentStack)
    
    // Log full error details
    console.group("Full Error Details")
    console.error("Type:", error.constructor.name)
    console.error("Message:", error.message)
    console.error("Stack:", error.stack)
    console.error("Component Stack:", errorInfo.componentStack)
    console.groupEnd()
  }

  handleReset = () => {
    console.log("[ErrorBoundary] Resetting error state")
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h1>
            
            <div className="bg-red-100 border border-red-300 rounded p-4 mb-6">
              <p className="text-sm font-semibold text-red-800 mb-2">
                {this.state.error.message}
              </p>
              {this.state.error.stack && (
                <pre className="text-xs text-red-700 overflow-auto max-h-40 whitespace-pre-wrap break-words">
                  {this.state.error.stack}
                </pre>
              )}
            </div>

            <details className="mb-6 text-xs text-gray-600">
              <summary className="cursor-pointer font-semibold mb-2">
                More Details
              </summary>
              <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40">
                Error Type: {this.state.error.constructor.name}
              </pre>
            </details>

            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
