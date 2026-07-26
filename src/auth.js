const AUTH_KEY = 'demo_authenticated';
const USER_KEY = 'demo_user';
const REMEMBER_KEY = 'demo_remember';

export const DEMO_CREDENTIALS = Object.freeze({
  email: 'instructor@example.edu',
  password: 'demo-password',
});

const DEMO_USER = {
  name: 'Demo Instructor',
  email: DEMO_CREDENTIALS.email,
};

export function signIn(email, password, remember = false) {
  if (email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password) {
    const store = remember ? localStorage : sessionStorage;
    store.setItem(AUTH_KEY, 'true');
    store.setItem(USER_KEY, JSON.stringify(DEMO_USER));
    if (remember) localStorage.setItem(REMEMBER_KEY, 'true');
    else localStorage.removeItem(REMEMBER_KEY);
    return { success: true, user: DEMO_USER };
  }
  return { success: false, error: 'Invalid email or password.' };
}

export function signOut() {
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(USER_KEY);
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function isAuthenticated() {
  return (
    sessionStorage.getItem(AUTH_KEY) === 'true' ||
    localStorage.getItem(AUTH_KEY) === 'true'
  );
}

export function getUser() {
  try {
    const raw =
      sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isRemembered() {
  return localStorage.getItem(REMEMBER_KEY) === 'true';
}
