import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import AppTheme from '../shared-theme/AppTheme';
import { brand, gray } from '../shared-theme/themePrimitives';
import { DEMO_CREDENTIALS, signIn, isAuthenticated, isRemembered } from '../auth';

/*
 * Uses the project's AppTheme for consistency, but renders form controls
 * as native elements so the shared MuiButton / MuiOutlinedInput overrides
 * (which turn dark-mode contained-primary buttons white) don't interfere.
 */

/* ── Page ──────────────────────────────────────────────── */
const pageSx = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  pt: 'min(13vh, 115px)',
  px: 3,
  pb: 8,
  position: 'relative',
  overflow: 'hidden',
  bgcolor: gray[900],
};

const glowSx = {
  position: 'absolute',
  top: '6%',
  left: '50%',
  transform: 'translateX(-50%)',
  width: 800,
  height: 600,
  borderRadius: '50%',
  background: `radial-gradient(ellipse, ${brand[400]}26 0%, ${brand[500]}0D 40%, transparent 68%)`,
  pointerEvents: 'none',
  zIndex: 0,
};

const gridSx = {
  position: 'absolute',
  inset: 0,
  opacity: 0.015,
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)
  `,
  backgroundSize: '80px 80px',
  pointerEvents: 'none',
  zIndex: 0,
};

/* ── Card ──────────────────────────────────────────────── */
const cardSx = {
  width: '100%',
  maxWidth: 560,
  p: '26px 38px 24px',
  borderRadius: '14px',
  border: `1px solid ${gray[700]}`,
  borderTop: `1px solid ${brand[400]}22`,
  bgcolor: gray[800],
  boxShadow: `
    0 1px 2px rgba(0,0,0,0.4),
    0 20px 56px rgba(0,0,0,0.50),
    0 0 100px -20px ${brand[400]}1A
  `,
  position: 'relative',
  zIndex: 1,
};

/* ── Form tokens ───────────────────────────────────────── */
const inputSx = {
  display: 'block',
  width: '100%',
  height: 44,
  px: '14px',
  py: 0,
  borderRadius: '8px',
  border: `1px solid ${gray[700]}`,
  bgcolor: gray[900],
  color: '#fff',
  fontSize: '0.91rem',
  fontFamily: '"Source Sans 3", "Segoe UI", sans-serif',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  '&:hover': { borderColor: gray[600] },
  '&:focus': { borderColor: brand[400], boxShadow: `0 0 0 2px ${brand[400]}33` },
  '&::placeholder': { color: gray[600] },
};

const labelSx = {
  display: 'block',
  color: gray[500],
  fontSize: '0.66rem',
  fontWeight: 600,
  fontFamily: '"Manrope", sans-serif',
  letterSpacing: '0.10em',
  textTransform: 'uppercase',
  mb: '4px',
  textAlign: 'left',
};

const btnBase = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: 44,
  mt: '8px',
  borderRadius: '8px',
  border: `1px solid ${brand[500]}`,
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontWeight: 700,
  fontFamily: '"Manrope", sans-serif',
  letterSpacing: '0.015em',
  color: brand[50],
  bgcolor: brand[600],
  backgroundImage: `linear-gradient(180deg, ${brand[500]}, ${brand[700]})`,
  boxShadow: `inset 0 1px 0 ${brand[400]}44, 0 2px 10px ${brand[900]}88, 0 0 24px -4px ${brand[400]}18`,
  transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover:not(:disabled)': {
    bgcolor: brand[500],
    backgroundImage: `linear-gradient(180deg, ${brand[400]}, ${brand[600]})`,
    boxShadow: `inset 0 1px 0 ${brand[300]}55, 0 6px 20px ${brand[900]}AA, 0 0 32px -4px ${brand[400]}28`,
    transform: 'translateY(-1.5px)',
  },
  '&:active:not(:disabled)': {
    bgcolor: brand[700],
    backgroundImage: 'none',
    boxShadow: `inset 0 2px 6px ${brand[900]}`,
    transform: 'translateY(0.5px)',
  },
  '&:disabled': {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};

/* Eye toggle button */
const toggleBtnSx = {
  position: 'absolute',
  right: 10,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: gray[500],
  p: '4px',
  display: 'flex',
  alignItems: 'center',
  '&:hover': { color: gray[300] },
};

/* Checkbox row */
const checkboxSx = {
  appearance: 'none',
  WebkitAppearance: 'none',
  width: 16,
  height: 16,
  borderRadius: '4px',
  border: `1px solid ${gray[600]}`,
  bgcolor: gray[900],
  cursor: 'pointer',
  verticalAlign: 'middle',
  mr: '6px',
  position: 'relative',
  transition: 'border-color 0.15s, background-color 0.15s',
  '&:checked': {
    bgcolor: brand[400],
    borderColor: brand[400],
  },
  '&:checked::after': {
    content: '""',
    position: 'absolute',
    left: '4.5px',
    top: '1.5px',
    width: 5,
    height: 9,
    border: 'solid #fff',
    borderWidth: '0 1.5px 1.5px 0',
    transform: 'rotate(45deg)',
  },
  '&:hover': {
    borderColor: gray[500],
  },
};

/* ── SVG icons (inline to avoid MUI icon overrides) ──── */
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

/* Spinner */
const Spinner = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite', marginRight: 8 }}>
    <path d="M12 2a10 10 0 0 1 10 10" />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </svg>
);

/* ── Component ─────────────────────────────────────────── */

export default function SignIn(props) {
  const navigate = useNavigate();
  const [error, setError] = React.useState('');
  const [emailErr, setEmailErr] = React.useState('');
  const [passErr, setPassErr] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
  const [remember, setRemember] = React.useState(() => isRemembered());
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const email = (fd.get('email') || '').trim();
    const password = fd.get('password') || '';

    /* Client-side validation */
    let ok = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailErr('Enter a valid email address.');
      ok = false;
    } else setEmailErr('');
    if (!password) {
      setPassErr('Password is required.');
      ok = false;
    } else setPassErr('');
    if (!ok) return;

    /* Simulate brief network delay for realism */
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const result = signIn(email, password, remember);
    setLoading(false);

    if (result.success) navigate('/', { replace: true });
    else setError(result.error);
  };

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />
      <Box sx={pageSx}>
        <Box sx={glowSx} />
        <Box sx={gridSx} />

        {/* ── Page title — centered ── */}
        <Stack sx={{ alignItems: 'center', mb: 2, position: 'relative', zIndex: 1 }}>
          <Typography
            component="h1"
            sx={{
              color: '#fff',
              fontFamily: '"Manrope", sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(1.4rem, 2.8vw, 1.75rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              textAlign: 'center',
            }}
          >
            Instructor Analytics Dashboard
          </Typography>
          <Typography
            sx={{
              color: gray[500],
              fontSize: '0.82rem',
              mt: 0.75,
              textAlign: 'center',
            }}
          >
            Monitor risk, engagement, and interventions in one place.
          </Typography>
        </Stack>

        {/* ── Card ── */}
        <Box sx={cardSx}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
            <Box
              sx={{
                width: 3,
                height: 24,
                borderRadius: '2px',
                background: `linear-gradient(180deg, ${brand[300]}, ${brand[500]})`,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                color: '#fff',
                fontFamily: '"Manrope", sans-serif',
                fontWeight: 700,
                fontSize: '1.05rem',
                letterSpacing: '-0.01em',
              }}
            >
              Sign in to your account
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 2,
                borderRadius: '8px',
                bgcolor: 'rgba(211,47,47,0.08)',
                color: '#f5a5a5',
                border: '1px solid rgba(211,47,47,0.12)',
                '& .MuiAlert-icon': { color: '#f5a5a5' },
              }}
            >
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
          >
            {/* Email */}
            <Box>
              <Box component="label" htmlFor="si-email" sx={labelSx}>Email</Box>
              <Box
                component="input"
                id="si-email"
                name="email"
                type="email"
                placeholder=""
                autoComplete="email"
                autoFocus
                required
                disabled={loading}
                sx={inputSx}
              />
              {emailErr && (
                <Typography sx={{ color: '#f5a5a5', fontSize: '0.72rem', mt: 0.5 }}>{emailErr}</Typography>
              )}
            </Box>

            {/* Password with show/hide toggle */}
            <Box>
              <Box component="label" htmlFor="si-pass" sx={labelSx}>Password</Box>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="input"
                  id="si-pass"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder=""
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  sx={{ ...inputSx, pr: '40px' }}
                />
                <Box
                  component="button"
                  type="button"
                  tabIndex={-1}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPass((v) => !v)}
                  sx={toggleBtnSx}
                >
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </Box>
              </Box>
              {passErr && (
                <Typography sx={{ color: '#f5a5a5', fontSize: '0.72rem', mt: 0.5 }}>{passErr}</Typography>
              )}
            </Box>

            {/* Remember me */}
            <Box
              component="label"
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                userSelect: 'none',
                mt: '2px',
              }}
            >
              <Box
                component="input"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                sx={checkboxSx}
              />
              <Typography sx={{ color: gray[400], fontSize: '0.78rem' }}>
                Remember me
              </Typography>
            </Box>

            {/* Submit */}
            <Box component="button" type="submit" disabled={loading} sx={btnBase}>
              {loading && <Spinner />}
              {loading ? 'Signing in\u2026' : 'Sign In'}
            </Box>

            <Typography sx={{ color: gray[500], fontSize: '0.72rem', lineHeight: 1.45, textAlign: 'center' }}>
              Demo access: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
            </Typography>
          </Box>
        </Box>
      </Box>
    </AppTheme>
  );
}
