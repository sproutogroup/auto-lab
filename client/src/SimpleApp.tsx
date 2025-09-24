import { useState } from "react";

export default function SimpleApp() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1>Simple Test App</h1>
      <p>If you can see this, React is working properly.</p>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
      <div style={{ marginTop: "20px" }}>
        <p>This is a minimal React app to test if the webview works.</p>
        <p>If this loads without errors, the React hooks issue is resolved.</p>
      </div>
    </div>
  );
}
