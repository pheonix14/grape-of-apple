import { CONFIG } from './config.js';

export class AuthController {
    constructor() {
        this.panel = document.getElementById('auth-panel');
        this.form = document.getElementById('auth-form');
        this.profile = document.getElementById('auth-profile');
        this.statusText = document.getElementById('auth-status');
        
        this.userIdInput = document.getElementById('auth-user-id');
        this.passwordInput = document.getElementById('auth-password');
        this.profileName = document.getElementById('auth-profile-name');
        
        this.badgeAdmin = document.getElementById('badge-admin');
        this.badgeGuide = document.getElementById('badge-guide');
        
        this.btnLogin = document.getElementById('btn-auth-login');
        this.btnSignup = document.getElementById('btn-auth-signup');
        this.btnLogout = document.getElementById('btn-auth-logout');
        this.btnClose = document.getElementById('btn-auth-close');
        this.btnKeyboard = document.getElementById('auth-keyboard-btn');
        
        // User HUD
        this.userHUD = document.getElementById('user-hud');
        this.hudName = document.getElementById('user-hud-name');
        this.btnHUDLogout = document.getElementById('btn-hud-logout');

        this.currentUser = null;
        this.init();
    }

    init() {
        if (this.btnClose) this.btnClose.addEventListener('click', () => this.close());
        if (this.btnLogin) this.btnLogin.addEventListener('click', () => this.handleLogin());
        if (this.btnSignup) this.btnSignup.addEventListener('click', () => this.handleSignup());
        if (this.btnLogout) this.btnLogout.addEventListener('click', () => this.handleLogout());
        if (this.btnHUDLogout) this.btnHUDLogout.addEventListener('click', () => this.handleLogout());

        if (this.btnKeyboard) {
            this.btnKeyboard.addEventListener('click', () => {
                if (window.virtualKeyboard) {
                    const target = document.activeElement === this.passwordInput ? this.passwordInput : this.userIdInput;
                    window.virtualKeyboard.toggle(target);
                }
            });
        }

        [this.userIdInput, this.passwordInput].forEach(input => {
            if (!input) return;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.handleLogin();
            });
        });

        const savedUser = localStorage.getItem('grape_os_user');
        if (savedUser) {
            try {
                this.showProfile(JSON.parse(savedUser));
            } catch (e) {
                localStorage.removeItem('grape_os_user');
            }
        }
    }

    handleHandGesture(hand) {
        if (!this.panel || this.panel.classList.contains('hidden')) return;
        const rect = this.panel.getBoundingClientRect();
        const isHovering = hand.x >= rect.left && hand.x <= rect.right &&
                           hand.y >= rect.top && hand.y <= rect.bottom;

        if (isHovering) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const tiltX = (hand.y - centerY) / (rect.height / 2) * -10;
            const tiltY = (hand.x - centerX) / (rect.width / 2) * 10;
            this.panel.style.transition = "transform 0.1s ease-out";
            this.panel.style.transform = `translate(-50%, -50%) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
        } else {
            this.panel.style.transition = "transform 0.5s ease-out";
            this.panel.style.transform = "translate(-50%, -50%) perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
        }
    }

    open() {
        this.panel.classList.remove('hidden');
        this.statusText.innerText = this.currentUser ? "SESSION ACTIVE" : "SECURITY PROTOCOL 1.0";
    }

    async handleLogin() {
        const userId = this.userIdInput.value.trim();
        const password = this.passwordInput.value.trim();

        if (!userId || !password) {
            this.statusText.innerText = "MISSING CREDENTIALS";
            this.statusText.classList.add('text-red-400');
            return;
        }

        this.statusText.innerText = "SYNC...";
        this.statusText.classList.remove('text-red-400');
        this.btnLogin.disabled = true;

        try {
            const hashedPassword = await this.sha256(password);
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, password: hashedPassword })
            });
            const result = await response.json();

            if (result.status === 'ok') {
                this.showProfile(result.user);
                localStorage.setItem('grape_os_user', JSON.stringify(result.user));
                this.statusText.innerText = "LINK ESTABLISHED";
                setTimeout(() => this.close(), 1500);
            } else {
                this.statusText.innerText = result.message || "ACCESS DENIED";
                this.statusText.classList.add('text-red-400');
            }
        } catch (err) {
            this.statusText.innerText = "BACKEND OFFLINE";
            this.statusText.classList.add('text-red-400');
        } finally {
            this.btnLogin.disabled = false;
        }
    }

    async handleSignup() {
        const userId = this.userIdInput.value.trim();
        const password = this.passwordInput.value.trim();

        if (!userId || !password || userId.length < 3 || password.length < 4) {
            this.statusText.innerText = "ID/KEY TOO SHORT";
            this.statusText.classList.add('text-red-400');
            return;
        }

        this.statusText.innerText = "ARCHIVING IDENTITY...";
        this.statusText.classList.remove('text-red-400');
        this.btnSignup.disabled = true;

        try {
            const hashedPassword = await this.sha256(password);
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, password: hashedPassword })
            });
            const result = await response.json();

            if (result.status === 'ok') {
                this.statusText.innerText = "IDENTITY ARCHIVED. AUTO-LOGIN...";
                this.statusText.classList.add('text-green-400');
                
                // AUTO-LOGIN DIRECTLY
                setTimeout(() => {
                    this.showProfile(result.user);
                    localStorage.setItem('grape_os_user', JSON.stringify(result.user));
                    setTimeout(() => this.close(), 1500);
                }, 1000);
            } else {
                this.statusText.innerText = result.message || "ARCHIVE FAILED";
                this.statusText.classList.add('text-red-400');
            }
        } catch (err) {
            this.statusText.innerText = "BACKEND OFFLINE";
            this.statusText.classList.add('text-red-400');
        } finally {
            this.btnSignup.disabled = false;
        }
    }

    showProfile(user) {
        this.currentUser = user;
        this.form.classList.add('hidden');
        this.profile.classList.remove('hidden');
        this.profileName.innerText = user.user_id;
        
        if (this.badgeAdmin) {
            if (user.is_admin) this.badgeAdmin.classList.remove('hidden');
            else this.badgeAdmin.classList.add('hidden');
        }
        if (this.badgeGuide) {
            if (user.is_guide) this.badgeGuide.classList.remove('hidden');
            else this.badgeGuide.classList.add('hidden');
        }
        this.statusText.innerText = "SESSION ACTIVE";
        
        // Update HUD
        if (this.userHUD) {
            this.hudName.innerText = user.user_id;
            this.userHUD.classList.remove('opacity-0', 'pointer-events-none', 'translate-x-10');
            this.userHUD.classList.add('opacity-100', 'translate-x-0');
        }

        // Notify Reward Engine to update balance
        if (window.rewardEngine) window.rewardEngine.updateLiveBalance();
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('grape_os_user');
        this.profile.classList.add('hidden');
        this.form.classList.remove('hidden');
        this.userIdInput.value = '';
        this.passwordInput.value = '';
        if (this.userHUD) {
            this.userHUD.classList.add('opacity-0', 'pointer-events-none', 'translate-x-10');
            this.userHUD.classList.remove('opacity-100', 'translate-x-0');
        }
        
        if (window.rewardEngine) {
            window.rewardEngine.reset();
        }
    }

    async sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    close() {
        this.panel.classList.add('hidden');
        if (window.virtualKeyboard) window.virtualKeyboard.close();
    }
}
