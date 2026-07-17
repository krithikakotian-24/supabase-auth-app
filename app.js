// AETHER AUTH - APPLICATION LOGIC

// 1. SUPABASE CONFIGURATION
const SUPABASE_URL = 'https://cojafwhflvjxgzfytcjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvamFmd2hmbHZqeGd6Znl0Y2p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MjA4MjYsImV4cCI6MjA5NjQ5NjgyNn0.PIOpSd7Mq9w3SUGWwjRajhEoH5V2PBeSgR1O-DhFYtc';

const _supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentSession = null;
let loginMethod = 'email'; // 'email' or 'phone'
let phoneAuthStep = 'enter-phone'; // 'enter-phone' or 'enter-otp'

function initIcons() {
  if (window.lucide) window.lucide.createIcons();
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<div class="toast-message">${message}</div>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showView(viewId) {
  const allViews = ['view-login','view-signup','view-reset','view-update-password','view-dashboard'];
  allViews.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('active');
      el.style.display = 'none';
    }
  });
  const target = document.getElementById(viewId);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
  initIcons();
}

function renderDashboard() {
  if (!currentUser) return;
  const emailEl = document.getElementById('user-email-display');
  const idEl = document.getElementById('user-id-display');
  const lastEl = document.getElementById('user-last-login');
  const avatarEl = document.getElementById('user-avatar-initial');
  if (emailEl) emailEl.textContent = currentUser.email;
  if (idEl) idEl.textContent = currentUser.id;
  if (lastEl) lastEl.textContent = new Date(currentUser.last_sign_in_at || currentUser.created_at).toLocaleString();
  if (avatarEl) avatarEl.textContent = currentUser.email[0].toUpperCase();
}

async function initSession() {
  const { data } = await _supabaseClient.auth.getSession();
  currentSession = data.session;
  currentUser = data.session?.user || null;
  if (currentSession) { showView('view-dashboard'); renderDashboard(); }
  else showView('view-login');

  _supabaseClient.auth.onAuthStateChange((event, session) => {
    currentSession = session;
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN') {
      showToast('Signed in successfully!', 'success');
      showView('view-dashboard');
      renderDashboard();
    } else if (event === 'SIGNED_OUT') {
      showToast('Signed out.', 'info');
      showView('view-login');
    } else if (event === 'PASSWORD_RECOVERY') {
      showView('view-update-password');
    }
  });
}

// Navigation buttons
document.addEventListener('DOMContentLoaded', () => {
  initIcons();
  initSession();

  // Signup link
  document.getElementById('link-goto-signup')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-signup');
  });

  // Login link
  document.getElementById('link-goto-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-login');
  });

  // Forgot password link
  document.getElementById('link-goto-reset')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-reset');
  });

  // Back to login from reset
  document.getElementById('link-reset-back')?.addEventListener('click', (e) => {
    e.preventDefault();
    showView('view-login');
  });

  // Signup form
  document.getElementById('form-signup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!email || !password) { showToast('Please fill all fields.', 'error'); return; }
    const { error } = await _supabaseClient.auth.signUp({ email, password });
    if (error) showToast(error.message, 'error');
    else showToast('Check your email to confirm your account!', 'success');
  });

  // Email/Phone login method toggle
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loginMethod = btn.dataset.method;
      phoneAuthStep = 'enter-phone';

      const emailGroup = document.getElementById('login-email-group');
      const passwordGroup = document.getElementById('login-password-group');
      const phoneGroup = document.getElementById('login-phone-group');
      const otpGroup = document.getElementById('login-otp-group');
      const btnSpan = document.querySelector('#btn-login span');

      if (loginMethod === 'email') {
        emailGroup.style.display = 'flex';
        passwordGroup.style.display = 'flex';
        phoneGroup.style.display = 'none';
        otpGroup.style.display = 'none';
        btnSpan.textContent = 'Sign In';
      } else {
        emailGroup.style.display = 'none';
        passwordGroup.style.display = 'none';
        phoneGroup.style.display = 'flex';
        otpGroup.style.display = 'none';
        btnSpan.textContent = 'Send Code';
      }
      initIcons();
    });
  });

  // Login form
  document.getElementById('form-login')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (loginMethod === 'email') {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      if (!email || !password) { showToast('Please fill all fields.', 'error'); return; }
      const { error } = await _supabaseClient.auth.signInWithPassword({ email, password });
      if (error) showToast(error.message, 'error');
      return;
    }

    // Phone login flow
    const phone = document.getElementById('login-phone').value.trim();
    if (!phone) { showToast('Please enter your phone number.', 'error'); return; }

    if (phoneAuthStep === 'enter-phone') {
      const { error } = await _supabaseClient.auth.signInWithOtp({ phone });
      if (error) { showToast(error.message, 'error'); return; }
      showToast('Verification code sent!', 'success');
      document.getElementById('login-otp-group').style.display = 'flex';
      document.querySelector('#btn-login span').textContent = 'Verify & Sign In';
      phoneAuthStep = 'enter-otp';
      initIcons();
    } else {
      const otp = document.getElementById('login-otp').value.trim();
      if (otp.length !== 6) { showToast('Enter the 6-digit code.', 'error'); return; }
      const { error } = await _supabaseClient.auth.verifyOtp({ phone, token: otp, type: 'sms' });
      if (error) showToast(error.message, 'error');
      // onAuthStateChange will handle redirect to dashboard on success
    }
  });

  // Reset form
  document.getElementById('form-reset')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reset-email').value.trim();
    if (!email) { showToast('Please enter your email.', 'error'); return; }
    const { error } = await _supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) showToast(error.message, 'error');
    else { showToast('Reset link sent! Check your email.', 'success'); showView('view-login'); }
  });

  // Update password form
  document.getElementById('form-update-password')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('update-password').value;
    if (!password) { showToast('Please enter a password.', 'error'); return; }
    const { error } = await _supabaseClient.auth.updateUser({ password });
    if (error) showToast(error.message, 'error');
    else { showToast('Password updated!', 'success'); showView('view-dashboard'); }
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await _supabaseClient.auth.signOut();
  });

  // Password strength meter
  document.getElementById('signup-password')?.addEventListener('input', (e) => {
    const val = e.target.value;
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');
    if (!fill || !text) return;
    let score = 0;
    if (val.length >= 6) score++;
    if (val.length >= 10) score++;
    if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Secure'];
    const colors = ['', '#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#22c55e'];
    const widths = ['0%', '20%', '40%', '60%', '80%', '100%'];
    fill.style.width = widths[score] || '0%';
    fill.style.backgroundColor = colors[score] || '';
    text.textContent = levels[score] || 'Password strength';
  });
});