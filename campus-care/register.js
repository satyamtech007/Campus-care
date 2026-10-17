/**
 * Campus Care - Student Registration Logic
 * Handles validation, Firebase Auth account creation, and Firestore user profile saving
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();

  const registerForm = document.getElementById('studentRegisterForm');
  const regFullName = document.getElementById('regFullName');
  const regRollNumber = document.getElementById('regRollNumber');
  const regPhone = document.getElementById('regPhone');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  const regSubmitBtn = document.getElementById('regSubmitBtn');
  const regSubmitText = document.getElementById('regSubmitText');
  const registerAlert = document.getElementById('registerAlert');
  const registerSuccessAlert = document.getElementById('registerSuccessAlert');

  // Real-time error clear as user types
  const inputElements = [regFullName, regRollNumber, regPhone, regEmail, regPassword, regConfirmPassword];
  inputElements.forEach(input => {
    if (input) {
      input.addEventListener('input', () => {
        clearFieldError(input.id);
        if (registerAlert) {
          registerAlert.style.display = 'none';
          registerAlert.textContent = '';
        }
      });
    }
  });

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors();

      const fullName = regFullName ? regFullName.value.trim() : '';
      const rollNumber = regRollNumber ? regRollNumber.value.trim().toUpperCase() : '';
      const phone = regPhone ? regPhone.value.trim() : '';
      const email = regEmail ? regEmail.value.trim().toLowerCase() : '';
      const password = regPassword ? regPassword.value : '';
      const confirmPassword = regConfirmPassword ? regConfirmPassword.value : '';

      // Validation
      let hasError = false;

      if (!fullName) {
        showFieldError('regFullName', 'Full name is required');
        hasError = true;
      } else if (fullName.length < 2) {
        showFieldError('regFullName', 'Please enter a valid full name');
        hasError = true;
      }

      if (!rollNumber) {
        showFieldError('regRollNumber', 'Roll number is required');
        hasError = true;
      } else if (rollNumber.length < 2) {
        showFieldError('regRollNumber', 'Please enter a valid roll number');
        hasError = true;
      }

      const phoneRegex = /^[0-9]{10}$/;
      if (!phone) {
        showFieldError('regPhone', 'Phone number is required');
        hasError = true;
      } else if (!phoneRegex.test(phone)) {
        showFieldError('regPhone', 'Please enter a valid 10-digit mobile number');
        hasError = true;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email) {
        showFieldError('regEmail', 'Email address is required');
        hasError = true;
      } else if (!emailRegex.test(email)) {
        showFieldError('regEmail', 'Please enter a valid email address');
        hasError = true;
      }

      if (!password) {
        showFieldError('regPassword', 'Password is required');
        hasError = true;
      } else if (password.length < 6) {
        showFieldError('regPassword', 'Password must be at least 6 characters long');
        hasError = true;
      }

      if (!confirmPassword) {
        showFieldError('regConfirmPassword', 'Please confirm your password');
        hasError = true;
      } else if (confirmPassword !== password) {
        showFieldError('regConfirmPassword', 'Passwords do not match');
        hasError = true;
      }

      if (hasError) {
        showToast('Please fix the highlighted errors before submitting.', 'error');
        return;
      }

      setLoading(true);

      try {
        if (!window.CampusCareFirebase || !CampusCareFirebase.auth || !CampusCareFirebase.db) {
          throw new Error('Firebase is not initialized. Please refresh the page and try again.');
        }

        // 1. Create user in Firebase Authentication
        const userCredential = await CampusCareFirebase.auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Set user displayName
        try {
          await user.updateProfile({ displayName: fullName });
        } catch (profileErr) {
          console.warn('Could not update auth profile displayName:', profileErr);
        }

        // 3. Save student details in Firestore under users collection
        const studentProfile = {
          name: fullName,
          studentID: rollNumber,
          phone: phone,
          email: email,
          role: 'student',
          createdAt: new Date().toISOString()
        };

        await CampusCareFirebase.db.collection('users').doc(user.uid).set(studentProfile);

        // 4. Show success message
        if (registerSuccessAlert) {
          registerSuccessAlert.textContent = 'Registration successful! Redirecting to login...';
          registerSuccessAlert.style.display = 'block';
        }
        showToast('Account created successfully! Redirecting to login...', 'success');

        // Sign out newly created user so they can sign in cleanly via login screen
        try {
          await CampusCareFirebase.auth.signOut();
        } catch (_) {}

        // 5. Redirect to login.html
        setTimeout(() => {
          window.location.href = 'login.html?registered=true';
        }, 1200);

      } catch (error) {
        console.error('Registration error:', error);
        setLoading(false);

        const authErrors = {
          'auth/email-already-in-use': 'This email is already registered. Please login instead.',
          'auth/invalid-email': 'Please enter a valid email address.',
          'auth/weak-password': 'Password is too weak. Please use at least 6 characters.',
          'auth/operation-not-allowed': 'Email/password registration is not enabled in Firebase.',
          'auth/network-request-failed': 'Network error. Please check your internet connection.',
          'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.'
        };

        const errorMessage = authErrors[error.code] || error.message || 'Registration failed. Please try again.';
        if (registerAlert) {
          registerAlert.textContent = errorMessage;
          registerAlert.style.display = 'block';
          registerAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        showToast(errorMessage, 'error');
      }
    });
  }

  function setLoading(loading) {
    if (regSubmitBtn) {
      regSubmitBtn.disabled = loading;
      if (loading) {
        regSubmitText.textContent = 'Creating Account...';
      } else {
        regSubmitText.textContent = 'Create Student Account';
      }
    }
  }

  function showFieldError(fieldId, msg) {
    const group = document.getElementById(`group-${fieldId}`);
    const err = document.getElementById(`err-${fieldId}`);
    if (group) group.classList.add('has-error');
    if (err) {
      err.textContent = msg;
      err.style.display = 'block';
    }
  }

  function clearFieldError(fieldId) {
    const group = document.getElementById(`group-${fieldId}`);
    const err = document.getElementById(`err-${fieldId}`);
    if (group) group.classList.remove('has-error');
    if (err) {
      err.textContent = '';
      err.style.display = 'none';
    }
  }

  function clearAllErrors() {
    if (registerAlert) {
      registerAlert.style.display = 'none';
      registerAlert.textContent = '';
    }
    if (registerSuccessAlert) {
      registerSuccessAlert.style.display = 'none';
      registerSuccessAlert.textContent = '';
    }
    document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));
    document.querySelectorAll('.error-msg').forEach(e => {
      e.textContent = '';
      e.style.display = 'none';
    });
  }
});

/**
 * Show/Hide Password Toggle
 */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('is-visible', show);
      const label = show ? 'Hide password' : 'Show password';
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  });
});

/**
 * Theme Toggle Functionality
 */
function initThemeToggle() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;

  function updateToggleUI(theme) {
    const label = theme === 'dark' ? 'Switch to Light mode' : 'Switch to Dark mode';
    themeToggleBtn.setAttribute('aria-label', label);
    themeToggleBtn.setAttribute('title', label);
  }

  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateToggleUI(currentTheme);

  themeToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const active = document.documentElement.getAttribute('data-theme') || 'light';
    const nextTheme = active === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('campusCare_theme', nextTheme);
    } catch (err) {}
    updateToggleUI(nextTheme);
  });
}

/**
 * Toast Notifications
 */
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  if (type === 'error') {
    toast.style.borderLeft = '4px solid #EF4444';
  } else if (type === 'success') {
    toast.style.borderLeft = '4px solid #10B981';
  }
  toast.innerHTML = `<span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 3500);
}
