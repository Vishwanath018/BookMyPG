"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Role = "customer" | "owner";
type Action = "login" | "signup";

interface AuthModalProps {
  onClose: () => void;
  initialAction?: Action;
  initialRole?: Role;
  redirectTo?: string;
}

export default function AuthModal({
  onClose,
  initialAction,
  initialRole,
  redirectTo,
}: AuthModalProps) {
  const [action, setAction] = useState<Action | null>(initialAction ?? null);
  const [role, setRole] = useState<Role | null>(initialRole ?? null);
  const [showMethods, setShowMethods] = useState(
    Boolean(initialAction && initialRole)
  );

  const [preview, setPreview] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function selectAccount(selectedAction: Action, selectedRole: Role) {
    setAction(selectedAction);
    setRole(selectedRole);
    setShowMethods(true);
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5 MB.");
      return;
    }

    setPreview(URL.createObjectURL(file));
  }

  async function handleCustomerSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const fullName = String(data.get("fullName") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const mobile = String(data.get("mobile") || "").trim();
    const accountType = String(data.get("accountType") || "");
    const gender = String(data.get("gender") || "");
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      alert("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "customer",
            full_name: fullName,
            phone: mobile,
            account_type: accountType,
            gender,
          },
        },
      });

      if (error) throw error;

      if (result.session && result.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", result.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.role !== "customer") {
          await supabase.auth.signOut();
          throw new Error("Customer profile verification failed.");
        }

        router.replace(redirectTo || "/explore");
        router.refresh();
        return;
      }

      alert("Your account has been created. Please check your email if confirmation is required, then log in.");
      setAction("login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Customer registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);

    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: result, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", result.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "customer") {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as a customer.");
      }

      router.replace(redirectTo || "/explore");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Customer login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") || "").trim();
    const businessName = String(data.get("businessName") || "").trim();
    const gender = String(data.get("gender") || "");
    const mobile = String(data.get("mobile") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const confirmPassword = String(data.get("confirmPassword") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      alert("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: result, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "owner",
            full_name: fullName,
            phone: mobile,
            business_name: businessName,
            gender,
          },
        },
      });

      if (error) throw error;

      if (result.session && result.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", result.user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profile?.role !== "owner") {
          await supabase.auth.signOut();
          throw new Error("Owner profile verification failed. Please contact support.");
        }

        router.replace("/owner/dashboard");
        router.refresh();
        return;
      }

      alert("Your owner account has been created. Please check your email to confirm your account, then log in.");
      setAction("login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Owner registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOwnerLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: result, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", result.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile?.role !== "owner") {
        await supabase.auth.signOut();
        throw new Error("This account is not registered as a PG Owner.");
      }

      router.replace("/owner/dashboard");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Owner login failed.");
    } finally {
      setLoading(false);
    }
  }
  function continueWithGoogle() {
    alert("Google authentication will be connected through Supabase.");
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
            onClick={() => {
              setShowMethods(false);
              setPreview("");
            }}
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
        ) : role === "customer" ? (
          <>
            <h2 id="auth-title">
              {action === "signup" ? "Create Account" : "Welcome Back"}
            </h2>

            <p className="auth-subtitle">
              {action === "signup"
                ? "Join BookMyPG and find your perfect stay."
                : "Login to continue to BookMyPG."}
            </p>

            <div className="customer-popup-content">
              <button
                type="button"
                className="customer-google-button"
                onClick={continueWithGoogle}
              >
                <span className="google-letter">G</span>
                Continue with Google
              </button>

              <div className="customer-auth-divider">
                OR {action === "signup" ? "REGISTER" : "LOGIN"} WITH MOBILE
              </div>

              {action === "signup" ? (
                <form
                  className="customer-auth-form"
                  onSubmit={handleCustomerSignup}
                >
                  <div className="customer-profile-upload">
                    <label
                      htmlFor="popupProfilePicture"
                      className="profile-picture-label"
                    >
                      {preview ? (
                        <img src={preview} alt="Profile preview" />
                      ) : (
                        <span className="profile-placeholder">+</span>
                      )}
                    </label>

                    <div>
                      <label
                        htmlFor="popupProfilePicture"
                        className="profile-upload-text"
                      >
                        Upload profile picture
                      </label>
                      <p>Optional · Maximum 5 MB</p>
                      <input
                        id="popupProfilePicture"
                        name="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={handleImage}
                        hidden
                      />
                    </div>
                  </div>

                  <label>Full name</label>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                  />
                  <label>Email address</label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    required
                  />

                  <label>Account type</label>
                  <select name="accountType" defaultValue="" required>
                    <option value="" disabled>Select account type</option>
                    <option value="student">Student</option>
                    <option value="employee">Employee</option>
                  </select>

                  <label>Gender</label>
                  <select name="gender" defaultValue="" required>
                    <option value="" disabled>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>

                  <label>Mobile number</label>
                  <div className="customer-mobile-input">
                    <span>+91</span>
                    <input
                      name="mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>

                  <label>Password</label>
                  <div className="customer-password-input">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <label>Confirm password</label>
                  <div className="customer-password-input">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>

                  <label className="customer-terms">
                    <input type="checkbox" required />
                    <span>
                      I agree to the Terms & Conditions and Privacy Policy.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="customer-primary-button"
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </button>
                </form>
              ) : (
                <form
                  className="customer-auth-form"
                  onSubmit={handleCustomerLogin}
                >
                  <label>Email address</label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    required
                  />

                  <label>Password</label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter password"
                    required
                  />

                  <div className="customer-forgot-password">
                    <button
                      type="button"
                      onClick={() =>
                        alert("Password recovery will be connected with Supabase.")
                      }
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="customer-primary-button"
                  >
                    {loading ? "Signing in..." : "Login"}
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 id="auth-title">
              {action === "signup" ? "Register Your PG" : "Owner Login"}
            </h2>

            <p className="auth-subtitle">
              {action === "signup"
                ? "Create your PG Owner account on BookMyPG."
                : "Login to manage your PG properties."}
            </p>

            <div className="customer-popup-content">
              <button
                type="button"
                className="customer-google-button"
                onClick={continueWithGoogle}
              >
                <span className="google-letter">G</span>
                Continue with Google
              </button>

              <div className="customer-auth-divider">
                OR {action === "signup" ? "REGISTER" : "LOGIN"} WITH MOBILE
              </div>

              {action === "signup" ? (
                <form
                  className="customer-auth-form"
                  onSubmit={handleOwnerSignup}
                >
                  <div className="customer-profile-upload">
                    <label
                      htmlFor="ownerProfilePicture"
                      className="profile-picture-label"
                    >
                      {preview ? (
                        <img src={preview} alt="Owner profile preview" />
                      ) : (
                        <span className="profile-placeholder">+</span>
                      )}
                    </label>

                    <div>
                      <label
                        htmlFor="ownerProfilePicture"
                        className="profile-upload-text"
                      >
                        Upload profile picture
                      </label>
                      <p>Optional · Maximum 5 MB</p>
                      <input
                        id="ownerProfilePicture"
                        name="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={handleImage}
                        hidden
                      />
                    </div>
                  </div>

                  <label>Owner full name</label>
                  <input
                    name="fullName"
                    type="text"
                    placeholder="Enter owner full name"
                    required
                  />

                  <label>PG / Business name</label>
                  <input
                    name="businessName"
                    type="text"
                    placeholder="Enter your PG or business name"
                    required
                  />

                  <label>Email address</label>
                  <input
                    name="email"
                    type="email"
                    placeholder="Enter your email address"
                    required
                  />

                  <label>Gender</label>
                  <select name="gender" defaultValue="" required>
                    <option value="" disabled>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>

                  <label>Mobile number</label>
                  <div className="customer-mobile-input">
                    <span>+91</span>
                    <input
                      name="mobile"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      required
                    />
                  </div>

                  <label>Password</label>
                  <div className="customer-password-input">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <label>Confirm password</label>
                  <div className="customer-password-input">
                    <input
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                    >
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>

                  <label className="customer-terms">
                    <input type="checkbox" required />
                    <span>
                      I agree to the Terms & Conditions and Privacy Policy.
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="customer-primary-button"
                  >
                    {loading ? "Creating account..." : "Create Owner Account"}
                  </button>
                </form>
              ) : (
                <form
                  className="customer-auth-form"
                  onSubmit={handleOwnerLogin}
                >
                  <label>Email address</label>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your registered email"
                    required
                  />

                  <label>Password</label>
                  <div className="customer-password-input">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <div className="customer-forgot-password">
                    <button
                      type="button"
                      onClick={() =>
                        alert("Password recovery will be connected with Supabase.")
                      }
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="customer-primary-button"
                  >
                    {loading ? "Signing in..." : "Login"}
                  </button>
                </form>
              )}
            </div>
          </>
        )}

        {role !== "customer" && !(role === "owner" && action === "signup") && (
          <div className="auth-terms">
            By continuing, you agree to our
            <br />
            <a href="/terms">Terms & Conditions</a> and{" "}
            <a href="/privacy">Privacy Policy</a>.
          </div>
        )}
      </div>
    </div>
  );
}





