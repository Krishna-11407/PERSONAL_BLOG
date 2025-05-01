document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterBtn = document.getElementById('showRegister');
    const showLoginBtn = document.getElementById('showLogin');
    const loginContainer = document.querySelector('.login-container');
    const registerContainer = document.querySelector('.register-container');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const registerError = document.getElementById('registerError');
    const registerSuccess = document.getElementById('registerSuccess');

    // Toggle between login and register forms
    showRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    });

    showLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.previousElementSibling;
            const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
            input.setAttribute('type', type);
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');
        });
    });

    // Handle login form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Signing in...</span>';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: document.getElementById('email').value,
                    password: document.getElementById('password').value
                })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/';
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.classList.remove('hidden');
            errorMessage.querySelector('span').textContent = error.message || 'Failed to login. Please try again.';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Sign In</span><i class="fas fa-sign-in-alt"></i>';
        }
    });

    // Add email validation function
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Add real-time email validation
    const regEmailInput = document.getElementById('regEmail');
    if (regEmailInput) {
        regEmailInput.addEventListener('input', function() {
            const email = this.value;
            const errorElement = this.nextElementSibling;
            
            if (!email) {
                this.classList.remove('valid', 'invalid');
                if (errorElement) errorElement.textContent = '';
                return;
            }

            if (!validateEmail(email)) {
                this.classList.add('invalid');
                this.classList.remove('valid');
                if (errorElement) errorElement.textContent = 'Please enter a valid email address';
            } else {
                this.classList.add('valid');
                this.classList.remove('invalid');
                if (errorElement) errorElement.textContent = '';
            }
        });
    }

    // Update register form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating Account...</span>';

        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const confirmPassword = document.getElementById('regConfirmPassword').value;

        // Validate email format
        if (!validateEmail(email)) {
            registerError.classList.remove('hidden');
            registerError.querySelector('span').textContent = 'Please enter a valid email address';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Create Account</span><i class="fas fa-user-plus"></i>';
            return;
        }

        if (password !== confirmPassword) {
            registerError.classList.remove('hidden');
            registerError.querySelector('span').textContent = 'Passwords do not match';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Create Account</span><i class="fas fa-user-plus"></i>';
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = '/';
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            registerError.classList.remove('hidden');
            registerError.querySelector('span').textContent = error.message || 'Failed to register. Please try again.';
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span class="btn-text">Create Account</span><i class="fas fa-user-plus"></i>';
        }
    });

    // Social login buttons
    document.querySelectorAll('.social-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Social login functionality will be implemented soon!');
        });
    });
}); 