import { useState, useEffect } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { gameStore } from '../store/gameStore';
import { FONT_FAMILY } from '../config';
import { X, Mail, User, LogOut } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { TranslationKeys } from '../i18n/types';

type Tab = 'email' | 'username';

function friendlyAuthError(err: unknown, t: (key: TranslationKeys) => string): string {
  const msg = (err as Error).message || '';
  if (msg.includes('InvalidAccountId')) return t('auth.errors.noAccount');
  if (msg.includes('InvalidSecret')) return t('auth.errors.wrongPassword');
  if (msg.includes('TooManyFailedAttempts')) return t('auth.errors.tooManyAttempts');
  if (msg.includes('AccountAlreadyExists') || msg.includes('already exists'))
    return t('auth.errors.usernameTaken');
  if (msg.includes('InvalidVerificationCode')) return t('auth.errors.invalidCode');
  return msg || t('auth.errors.generic');
}

export function AuthModal() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Email OTP state
  const [emailStep, setEmailStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [pickedName, setPickedName] = useState('');
  const setDisplayNameMutation = useMutation(api.users.setDisplayName);

  // Username/password state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Viewer is the sole source of truth for deciding which view to show.
  const viewer = useQuery(api.users.viewer);
  const needsUsername = viewer?.needsUsername ?? false;
  const showProfile = isAuthenticated && viewer != null && !viewer.isAnonymous && !needsUsername;

  const close = () => gameStore.getState().setShowAuthModal(false);

  const handleEmailSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      if (emailStep === 'email') {
        await signIn('resend-otp', { email });
        setEmailStep('code');
      } else {
        // Flag transition so AuthGate doesn't auto-sign-in as anonymous
        gameStore.getState().setAuthTransition(true);
        await signIn('resend-otp', { email, code });
        // Server confirmed sign-in. Reload so the Convex client picks up
        // the new session token — the WebSocket doesn't refresh automatically.
        window.location.reload();
        return;
      }
    } catch (err) {
      gameStore.getState().setAuthTransition(false);
      setError(friendlyAuthError(err, t));
    }
    setLoading(false);
  };

  const handlePickUsername = async () => {
    const name = pickedName.trim();
    if (!name) return;
    setLoading(true);
    setError('');
    try {
      await setDisplayNameMutation({ displayName: name });
      gameStore.getState().setDisplayName(name);
      gameStore.getState().setIsAnonymous(false);
      setLoading(false);
      close();
    } catch (err) {
      setError((err as Error).message || t('auth.errors.generic'));
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (flow: 'signIn' | 'signUp') => {
    setLoading(true);
    setError('');
    try {
      // Flag transition so AuthGate doesn't auto-sign-in as anonymous
      gameStore.getState().setAuthTransition(true);
      await signIn('password', { email: username, password, flow });
      // Server confirmed sign-in. Reload so the Convex client picks up
      // the new session token — the WebSocket doesn't refresh automatically.
      window.location.reload();
    } catch (err) {
      gameStore.getState().setAuthTransition(false);
      setError(friendlyAuthError(err, t));
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      gameStore.getState().setAuthTransition(false);
      await signOut();
    } catch {
      // ignore
    } finally {
      setLoading(false);
      close();
    }
  };

  // If the modal is open and the viewer says needsUsername, automatically
  // switch to the username picker view. This handles the case where
  // AuthGate re-opens the modal after a sign-in that created a new user.
  useEffect(() => {
    if (needsUsername) {
      setTab('email'); // reset tab so username picker shows cleanly
    }
  }, [needsUsername]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_FAMILY,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        style={{
          width: 380,
          background: '#fffaf0',
          borderRadius: 24,
          border: '4px solid #3e2723',
          boxShadow: '0 10px 0 #3e2723',
          padding: '24px 28px 20px',
          position: 'relative',
        }}
      >
        {/* Close button */}
        <div
          onClick={close}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 28,
            height: 28,
            borderRadius: 8,
            background: '#f5f0e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#3e2723',
          }}
        >
          <X size={16} strokeWidth={3} />
        </div>

        {showProfile ? (
          /* Profile view */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: '#ffca28',
                border: '3px solid #3e2723',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={28} strokeWidth={2.5} color="#3e2723" />
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: '#3e2723',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              {viewer?.displayName}
            </div>
            {viewer?.email && (
              <div
                style={{
                  fontSize: 13,
                  color: '#8d6e63',
                  fontWeight: 700,
                }}
              >
                {viewer.email}
              </div>
            )}
            <button
              onClick={handleSignOut}
              disabled={loading}
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: '#ffffff',
                background: '#e53935',
                border: '3px solid #3e2723',
                borderRadius: 12,
                padding: '10px 24px',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: FONT_FAMILY,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                letterSpacing: '0.04em',
                opacity: loading ? 0.6 : 1,
              }}
            >
              <LogOut size={16} strokeWidth={3} />
              {t('auth.signOut')}
            </button>
          </div>
        ) : needsUsername ? (
          /* Username picker (after email OTP or on refresh) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#3e2723',
                textAlign: 'center',
                margin: '0 0 6px',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              {t('auth.chooseName')}
            </h2>
            <div
              style={{
                fontSize: 13,
                color: '#5d4037',
                textAlign: 'center',
                fontWeight: 700,
              }}
            >
              {t('auth.pickNameDesc')}
            </div>
            <AuthInput
              placeholder={t('auth.chooseUsername')}
              type="text"
              value={pickedName}
              onChange={setPickedName}
              disabled={loading}
            />
            <AuthButton
              label={t('auth.letsCook')}
              onClick={handlePickUsername}
              disabled={loading || !pickedName.trim()}
              loading={loading}
            />
            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: '#e53935',
                  textAlign: 'center',
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}
          </div>
        ) : (
          /* Sign-in view */
          <>
            <h2
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: '#3e2723',
                textAlign: 'center',
                margin: '0 0 14px',
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
              }}
            >
              {t('auth.account')}
            </h2>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <TabButton
                active={tab === 'email'}
                icon={<Mail size={14} strokeWidth={3} />}
                label={t('auth.emailTab')}
                onClick={() => {
                  setTab('email');
                  setError('');
                }}
              />
              <TabButton
                active={tab === 'username'}
                icon={<User size={14} strokeWidth={3} />}
                label={t('auth.usernameTab')}
                onClick={() => {
                  setTab('username');
                  setError('');
                }}
              />
            </div>

            {tab === 'email' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {emailStep === 'email' && (
                  <>
                    <AuthInput
                      placeholder={t('auth.emailAddress')}
                      type="email"
                      value={email}
                      onChange={setEmail}
                      disabled={loading}
                    />
                    <AuthButton
                      label={t('auth.sendCode')}
                      onClick={handleEmailSubmit}
                      disabled={loading || !email.trim()}
                      loading={loading}
                    />
                  </>
                )}
                {emailStep === 'code' && (
                  <>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#5d4037',
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {t('auth.codeSent', { email })}
                    </div>
                    <AuthInput
                      placeholder={t('auth.enterCode')}
                      type="text"
                      value={code}
                      onChange={setCode}
                      disabled={loading}
                    />
                    <AuthButton
                      label={t('auth.verify')}
                      onClick={handleEmailSubmit}
                      disabled={loading || !code.trim()}
                      loading={loading}
                    />
                    <div
                      onClick={() => {
                        setEmailStep('email');
                        setCode('');
                        setError('');
                      }}
                      style={{
                        fontSize: 12,
                        color: '#8d6e63',
                        textAlign: 'center',
                        cursor: 'pointer',
                        fontWeight: 700,
                      }}
                    >
                      {t('auth.differentEmail')}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <AuthInput
                  placeholder={t('auth.username')}
                  type="text"
                  value={username}
                  onChange={setUsername}
                  disabled={loading}
                />
                <AuthInput
                  placeholder={t('auth.password')}
                  type="password"
                  value={password}
                  onChange={setPassword}
                  disabled={loading}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <AuthButton
                    label={t('auth.logIn')}
                    onClick={() => handleUsernameSubmit('signIn')}
                    disabled={loading || !username.trim() || !password.trim()}
                    loading={loading}
                  />
                  <AuthButton
                    label={t('auth.create')}
                    onClick={() => handleUsernameSubmit('signUp')}
                    disabled={loading || !username.trim() || !password.trim()}
                    loading={loading}
                    secondary
                  />
                </div>
              </div>
            )}

            {error && (
              <div
                style={{
                  fontSize: 12,
                  color: '#e53935',
                  textAlign: 'center',
                  marginTop: 8,
                  fontWeight: 700,
                }}
              >
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 0',
        borderRadius: 10,
        border: `2px solid ${active ? '#3e2723' : '#e0e0e0'}`,
        background: active ? '#3e2723' : '#ffffff',
        color: active ? '#ffffff' : '#3e2723',
        textAlign: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'all 0.15s',
        boxShadow: active ? '0 3px 0 #2a1a12' : '0 3px 0 #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: '0.06em',
        fontFamily: FONT_FAMILY,
      }}
    >
      {icon}
      {label}
    </div>
  );
}

function AuthInput({
  placeholder,
  type,
  value,
  onChange,
  disabled,
}: {
  placeholder: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <input
      placeholder={placeholder}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 10,
        border: '2px solid #e0e0e0',
        fontSize: 15,
        fontWeight: 700,
        color: '#3e2723',
        fontFamily: FONT_FAMILY,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}

function AuthButton({
  label,
  onClick,
  disabled,
  loading,
  secondary,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '12px 0',
        borderRadius: 12,
        border: '3px solid #3e2723',
        background: disabled ? '#bdbdbd' : secondary ? '#8d6e63' : '#4caf50',
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 900,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: FONT_FAMILY,
        letterSpacing: '0.05em',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}