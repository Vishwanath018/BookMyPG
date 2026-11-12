"use client";

import { useState } from "react";

type Role = "customer" | "owner";
type Action = "login" | "signup";

interface AuthModalProps {
  onClose: () => void;
  initialAction?: Action;
  initialRole?: Role;
}

export default function AuthModal({
  onClose,
  initialAction,
  initialRole,
}: AuthModalProps) {
  const [action, setAction] = useState<Action | null>(
    initialAction ?? null
  );

  const [role, setRole] = useState<Role | null>(
    initialRole ?? null
  );

  const [showMethods, setShowMethods] = useState(
    Boolean(initialAction && initialRole)
  );

  function selectAccount(selectedAction: Action, selectedRole: Role) {
    setAction(selectedAction);
    setRole(selectedRole);
    setShowMethods(true);
  }

  function continueWith(method: "google" | "mobile") {
    alert(
      `${action === "login" ? "Login" : "Signup"} as ${role} using ${method}. Authentication integration will be added with Supabase.`
    );
  }

  return (
    <div className="auth-overlay" onMouseDown={onClose}>
      <div
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="auth-close"
          onClick={onClose}
          aria-label="Close authentication"
        >
          ×
        </button>

        {showMethods && (
          <button
            className="auth-back"
            onClick={() => setShowMethods(false)}
          >
            ← Back
          </button>
        )}

        {!showMethods ? (
          <>
            <h2 id="auth-title">Get Started</h2>

            <p className="auth-subtitle">
              Choose how you want to continue
            </p>

            <div className="auth-role-section">
              <h3>Customer</h3>

              <button
                className="auth-role-button auth-login-option"
                onClick={() => selectAccount("login", "customer")}
              >
                Login as Customer
              </button>

              <button
                className="auth-role-button auth-signup-option"
                onClick={() => selectAccount("signup", "customer")}
              >
                Sign up as Customer
              </button>
            </div>

            <div className="auth-role-section">
              <h3>PG Owner</h3>

              <button
                className="auth-role-button auth-login-option"
                onClick={() => selectAccount("login", "owner")}
              >
                Login as PG Owner
              </button>

              <button
                className="auth-role-button auth-signup-option"
                onClick={() => selectAccount("signup", "owner")}
              >
                Sign up as PG Owner
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="auth-title">
              {action === "login" ? "Login" : "Sign Up"} as{" "}
              {role === "customer" ? "Customer" : "PG Owner"}
            </h2>

            <p className="auth-subtitle">
              Continue to BookMyPG
            </p>

            <div className="auth-methods">
              <button
                className="auth-method-button"
                onClick={() => continueWith("google")}
              >
                <span className="google-icon">G</span>
                Continue with Google
              </button>

              <button
                className="auth-method-button"
                onClick={() => continueWith("mobile")}
              >
                <span className="mobile-icon">☎</span>
                Continue with Mobile Number
              </button>
            </div>

            <div className="auth-terms">
              By continuing, you agree to our
              <br />
              <a href="/terms">Terms & Conditions</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}


