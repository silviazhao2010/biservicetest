import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary 捕获到错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: '20px', textAlign: 'center', color: '#ff4d4f' }}>
          <h3>组件渲染出错</h3>
          <p>{this.state.error?.message || '未知错误'}</p>
          <button onClick={() => this.setState({ hasError: false, error: undefined })}>
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

