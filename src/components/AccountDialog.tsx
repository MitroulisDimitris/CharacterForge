// Account settings: display name and password (REQUIREMENTS §3.1).
import { useState, type FormEvent } from "react";
import { authError, MIN_PASSWORD, saveDisplayName, supabase, type Profile } from "../cloud";

export function AccountDialog({ profile, email, onSaved, onClose }: { profile: Profile; email: string; onSaved: (p: Profile) => void; onClose: () => void }) {
  const [name, setName] = useState(profile.display_name);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveName = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await saveDisplayName(profile.id, name.trim());
      onSaved({ ...profile, display_name: name.trim() });
      setMsg({ ok: true, text: "Name saved." });
    } catch (err) {
      setMsg({ ok: false, text: authError(err instanceof Error ? err.message : String(err)) });
    } finally {
      setBusy(false);
    }
  };
  const savePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setMsg({ ok: false, text: `Use at least ${MIN_PASSWORD} characters for the password.` });
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg({ ok: false, text: authError(error.message) });
    else {
      setPassword("");
      setMsg({ ok: true, text: "Password changed." });
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Account" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className="modal account-modal">
        <header className="modal-hero compact">
          <h2>Account</h2>
          <p>{email}</p>
        </header>
        <div className="modal-body">
          <form className="auth-form" onSubmit={saveName}>
            <label className="auth-field">
              <span>Your name</span>
              <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} autoComplete="nickname" />
              <small className="auth-hint">Shown to the other players and the DM.</small>
            </label>
            <button type="submit" className="btn" disabled={busy || !name.trim() || name.trim() === profile.display_name}>
              Save name
            </button>
          </form>
          <form className="auth-form" onSubmit={savePassword}>
            <label className="auth-field">
              <span>New password</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              <small className="auth-hint">At least {MIN_PASSWORD} characters.</small>
            </label>
            <button type="submit" className="btn" disabled={busy || !password}>
              Change password
            </button>
          </form>
          {msg && (
            <p className={msg.ok ? "auth-info" : "auth-error"} role="status">
              {msg.text}
            </p>
          )}
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
