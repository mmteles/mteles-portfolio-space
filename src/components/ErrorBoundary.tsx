import React from "react";

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep a console trace for debugging
    // eslint-disable-next-line no-console
    console.error("Uncaught error in component tree:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
          <h1 style={{ color: "#b91c1c" }}>Something went wrong</h1>
          <p style={{ color: "#333" }}>An unexpected error occurred. Please refresh the page and try again.</p>
          <p style={{ marginTop: 12, color: "#666" }}>Check the browser console for more details.</p>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}
