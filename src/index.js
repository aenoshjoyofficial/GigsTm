import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';

// Global error handler to catch unhandled JavaScript errors
window.onerror = function (message, source, lineno, colno, error) {
  let errorMsg = message;
  let stack = error instanceof Error ? error.stack : null;
  
  // Handle case where error is an object but message is just "[object Object]"
  if (message === "[object Object]" && error && typeof error === 'object') {
    errorMsg = error.message || JSON.stringify(error);
  } else if (typeof message === 'object' && message !== null) {
    errorMsg = message.message || JSON.stringify(message);
  }

  const errorDetails = {
    message: errorMsg,
    source: source,
    lineno: lineno,
    colno: colno,
    error: stack || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error))
  };
  console.error("Unhandled JavaScript Error:", errorDetails);
  return false; // Prevent default error handling
};

// Global promise rejection handler
window.onunhandledrejection = function (event) {
  let errorMsg = "Unhandled Promise Rejection";
  let error = event.reason;
  
  if (error && typeof error === 'object') {
    errorMsg = error.message || JSON.stringify(error);
  } else if (error) {
    errorMsg = String(error);
  }

  console.error("Unhandled Promise Rejection:", {
    message: errorMsg,
    reason: event.reason
  });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
