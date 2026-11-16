// Account screens (REQUIREMENTS §3.1): log in, sign up, "check your email", forgot password,
// choose a new password, and the message for an expired / used email link.
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { authError, linkProblem, markFreshLogin, MIN_PASSWORD, supabase, takeKicked } from "../cloud";
import { pendingJoin } from "../sessions";

type Mode = "login" | "signup" | "check" | "forgot" | "forgot-sent" | "link-expired";

const RESEND_WAIT = 60;
const redirect = () => window.location.origin + window.location.pathname;

function AuthCard({ title, tagline, children, crest = true }: { title: string; tagline?: ReactNode; children: ReactNode; crest?: boolean }) {
  return (
    <div className="auth-page">
      <main className="auth-card" aria-labelledby="auth-title">
        {crest && (
          <div className="auth-crest" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <path d="M32 4 56 18v28L32 60 8 46V18z" className="brand-hex" />
              <path d="M32 16 42 32 32 48 22 32z" className="brand-gem" />
            </svg>
          </div>
        )}
        <h1 id="auth-title">{title}</h1>
        {tagline && <p className="auth-tagline">{tagline}</p>}
        {children}
      </main>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="auth-field">
      <span>{label}</span>
      {children}
      {hint && <small className="auth-hint">{hint}</small>}
    </label>
  );
}

function PasswordInput({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="auth-pass">
      <input type={show ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" className="auth-show" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </span>
  );
}

const ErrorLine = ({ text }: { text: string }) =>
  text ? (
    <p className="auth-error" role="alert">
      {text}
    </p>
  ) : null;

/** Counts down after an email is sent, so "Resend" waits 60 seconds. */
function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(RESEND_WAIT)] as const;
}

export function Login() {
  const problem = linkProblem();
  const [kicked] = useState(takeKicked);
  const [mode, setMode] = useState<Mode>(problem ? "link-expired" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  const go = (m: Mode) => {
    setError("");
    setInfo("");
    setMode(m);
  };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setInfo("");
    try {
      await fn();
    } catch (e) {
      setError(authError(e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  };
  const cleanEmail = email.trim();
  const emailOk = /^\S+@\S+\.\S+$/.test(cleanEmail);

  const login = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      markFreshLogin();
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error && /email not confirmed/i.test(error.message)) {
        go("check");
        return;
      }
      if (error) throw error;
    });
  };
  const signup = (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters for the password.`);
    run(async () => {
      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { display_name: name.trim() }, emailRedirectTo: redirect() },
      });
      if (error) throw error;
      startCooldown();
      go("check");
    });
  };
  const resend = () =>
    run(async () => {
      const { error } = await supabase.auth.resend({ type: "signup", email: cleanEmail, options: { emailRedirectTo: redirect() } });
      if (error) throw error;
      startCooldown();
      setInfo("Sent. Check your inbox (and the spam folder).");
    });
  const forgot = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: redirect() });
      if (error) throw error;
      startCooldown();
      go("forgot-sent");
    });
  };

  if (mode === "signup")
    return (
      <AuthCard title="Create your account" tagline="Your characters, saved online and on every device.">
        <form onSubmit={signup} className="auth-form" noValidate>
          <Field label="Your name" hint="Shown to the other players and the DM.">
            <input autoComplete="nickname" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Email">
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password" hint={`At least ${MIN_PASSWORD} characters.`}>
            <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
          </Field>
          <ErrorLine text={error} />
          <button type="submit" className="btn primary auth-submit" disabled={busy || !name.trim() || !emailOk || !password}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="auth-note">
          Already have an account?{" "}
          <button type="button" className="link" onClick={() => go("login")}>
            Log in
          </button>
        </p>
      </AuthCard>
    );

  if (mode === "check")
    return (
      <AuthCard
        title="Check your email"
        tagline={
          <>
            We sent a link to <strong>{cleanEmail}</strong>. Tap <strong>Verify</strong> in that email to finish.
          </>
        }
      >
        <div className="auth-form">
          <p className="auth-tip">Tip · Can't find it? Look in the spam folder.</p>
          <ErrorLine text={error} />
          {info && <p className="auth-info">{info}</p>}
          <button type="button" className="btn auth-submit" disabled={busy || cooldown > 0} onClick={resend}>
            {cooldown > 0 ? `Resend email in ${cooldown} s` : busy ? "Sending…" : "Resend email"}
          </button>
        </div>
        <p className="auth-note">
          <button type="button" className="link" onClick={() => go("signup")}>
            Use a different email
          </button>
          {" · "}
          <button type="button" className="link" onClick={() => go("login")}>
            Back to log in
          </button>
        </p>
      </AuthCard>
    );

  if (mode === "forgot")
    return (
      <AuthCard title="Forgot your password?" tagline="Enter your email. We'll send a link to choose a new one.">
        <form onSubmit={forgot} className="auth-form" noValidate>
          <Field label="Email">
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <ErrorLine text={error} />
          <button type="submit" className="btn primary auth-submit" disabled={busy || !emailOk}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="auth-note">
          <button type="button" className="link" onClick={() => go("login")}>
            Back to log in
          </button>
        </p>
      </AuthCard>
    );

  if (mode === "forgot-sent")
    return (
      <AuthCard
        title="Check your email"
        tagline={
          <>
            If <strong>{cleanEmail}</strong> has an account, we sent it a <strong>Reset password</strong> link.
          </>
        }
      >
        <div className="auth-form">
          <p className="auth-tip">Tip · Can't find it? Look in the spam folder.</p>
          <ErrorLine text={error} />
          <button type="button" className="btn auth-submit" disabled={busy || cooldown > 0} onClick={() => forgot({ preventDefault() {} } as FormEvent)}>
            {cooldown > 0 ? `Send again in ${cooldown} s` : "Send again"}
          </button>
        </div>
        <p className="auth-note">
          <button type="button" className="link" onClick={() => go("login")}>
            Back to log in
          </button>
        </p>
      </AuthCard>
    );

  if (mode === "link-expired")
    return (
      <AuthCard title="This link doesn't work any more" tagline="Email links work once and expire after a while. Enter your email and we'll send a new one.">
        <form
          className="auth-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            resend();
          }}
        >
          <Field label="Email">
            <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
          </Field>
          <ErrorLine text={error} />
          {info && <p className="auth-info">{info}</p>}
          <button type="submit" className="btn primary auth-submit" disabled={busy || !emailOk || cooldown > 0}>
            {cooldown > 0 ? `Send again in ${cooldown} s` : busy ? "Sending…" : "Send a new link"}
          </button>
        </form>
        <p className="auth-note">
          Were you resetting your password?{" "}
          <button type="button" className="link" onClick={() => go("forgot")}>
            Send a reset link
          </button>
          <br />
          <button type="button" className="link" onClick={() => go("login")}>
            Back to log in
          </button>
        </p>
      </AuthCard>
    );

  return (
    <AuthCard title="Character Forge" tagline="Your character, through the whole campaign.">
      {kicked && (
        <p className="auth-info join-hint" role="status">
          You were logged out because your account logged in somewhere else (another phone, computer or browser). Only the newest login stays active. Tip · On a phone, open the site in your normal browser, not inside Messenger or Facebook: those count as a separate browser.
        </p>
      )}
      {pendingJoin() && (
        <p className="auth-info join-hint">
          You were invited to a session (code <strong>{pendingJoin()}</strong>). Log in or create an account to join.
        </p>
      )}
      <form onSubmit={login} className="auth-form" noValidate>
        <Field label="Email">
          <input type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password">
          <PasswordInput value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        <button type="button" className="link auth-forgot" onClick={() => go("forgot")}>
          Forgot your password?
        </button>
        <ErrorLine text={error} />
        <button type="submit" className="btn primary auth-submit" disabled={busy || !cleanEmail || !password}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="auth-note">
        New here?{" "}
        <button type="button" className="link" onClick={() => go("signup")}>
          Create an account
        </button>
      </p>
    </AuthCard>
  );
}

/** After a "Reset password" link: choose a new password (the link already logged the user in). */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(authError(error.message));
    else onDone();
  };
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={save} className="auth-form" noValidate>
        <Field label="New password" hint={`At least ${MIN_PASSWORD} characters.`}>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" />
        </Field>
        <ErrorLine text={error} />
        <button type="submit" className="btn primary auth-submit" disabled={busy || !password}>
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthCard>
  );
}

/** Shown while the saved login and the characters load. */
export function Loading({ text = "Loading your characters…" }: { text?: string }) {
  return (
    <div className="auth-page">
      <p className="auth-loading" role="status">
        {text}
      </p>
    </div>
  );
}
