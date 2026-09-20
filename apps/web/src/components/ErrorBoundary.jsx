import { Component } from 'react';
import { Button } from './Button.jsx';

// Last-resort safety net: without this, an uncaught render error (like the
// Avatar/null-name crash this was added alongside) unmounts the entire
// React tree, leaving the page background as the only visible thing - a
// blank/black dead screen with no way to navigate. This catches that,
// shows a real message, and offers a way out via a full reload (not a
// client-side navigate, since the error may have left app state broken).
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface-alt px-6 text-center">
          <p className="text-lg font-bold">Something went wrong</p>
          <p className="max-w-xs text-sm text-text-muted">
            This screen hit an unexpected error. Try going back to Home.
          </p>
          <Button onClick={() => window.location.assign('/home')}>Back to Home</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
