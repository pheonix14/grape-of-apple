export class SettingsController {
    constructor() {
        this.btnSettings = document.getElementById('settings-btn');
        this.panel = document.getElementById('settings-panel');
        
        this.isOpen = false;
        
        // CSS Variables to track
        this.appSize = 64; 
        this.hoverScale = 1.25;
        this.cameraZoom = 1.0;
        this.textSize = 16; 
        this.panelScale = 1.0;
        
        this.isMirrored = true; 
        this.activeTheme = null;
        this.activeSkin = null;
        this.gridFilter = false;
        this.cockpitMode = false;
        
        this.borderColor = '#ffffff';
        this.bgColor = '#000000';
        this.bgImage = null;
        this.isPrivacyMode = false;

        this.bindEvents();
        this.loadSettings(); // Load from Local or Backend
    }

    async loadSettings() {
        // 1. Try to load from Local Storage first for instant boot
        const local = localStorage.getItem('grape_os_settings');
        if (local) {
            this.applySettingsData(JSON.parse(local));
        }

        // 2. If logged in, try to load from Backend
        const savedUser = localStorage.getItem('grape_os_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                const res = await fetch(`/api/user/config/${user.user_id}`);
                const result = await res.json();
                if (result.status === 'ok' && Object.keys(result.settings).length > 0) {
                    this.applySettingsData(result.settings);
                    localStorage.setItem('grape_os_settings', JSON.stringify(result.settings));
                }
            } catch (e) {
                console.warn("Backend Config Load Failed:", e);
            }
        }
        this.updateStyles();
    }

    applySettingsData(data) {
        if (data.appSize) this.appSize = data.appSize;
        if (data.panelScale) this.panelScale = data.panelScale;
        if (data.textSize) this.textSize = data.textSize;
        if (data.isMirrored !== undefined) this.isMirrored = data.isMirrored;
        if (data.gridFilter !== undefined) this.gridFilter = data.gridFilter;
        if (data.cockpitMode !== undefined) this.cockpitMode = data.cockpitMode;
        if (data.borderColor) this.borderColor = data.borderColor;
        if (data.bgColor) this.bgColor = data.bgColor;
        if (data.bgImage !== undefined) this.bgImage = data.bgImage;
        if (data.isPrivacyMode !== undefined) this.isPrivacyMode = data.isPrivacyMode;
        
        this.applyTheme(data.activeTheme !== undefined ? data.activeTheme : null);
        this.applySkin(data.activeSkin !== undefined ? data.activeSkin : null);
        
        if (this.gridFilter) document.body.classList.add('tron-legacy-grid');
        if (this.cockpitMode) document.body.classList.add('cockpit-mode');
    }

    async saveSettings() {
        const settingsData = {
            appSize: this.appSize,
            panelScale: this.panelScale,
            textSize: this.textSize,
            isMirrored: this.isMirrored,
            activeTheme: this.activeTheme,
            activeSkin: this.activeSkin,
            gridFilter: this.gridFilter,
            cockpitMode: this.cockpitMode,
            borderColor: this.borderColor,
            bgColor: this.bgColor,
            bgImage: this.bgImage,
            isPrivacyMode: this.isPrivacyMode
        };

        // Save Local
        localStorage.setItem('grape_os_settings', JSON.stringify(settingsData));

        // Save Backend if logged in
        const savedUser = localStorage.getItem('grape_os_user');
        if (savedUser) {
            try {
                const user = JSON.parse(savedUser);
                await fetch('/api/user/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.user_id,
                        settings: settingsData
                    })
                });
            } catch (e) {
                console.error("Backend Config Save Failed:", e);
            }
        }
    }

    bindEvents() {
        this.btnSettings.addEventListener('click', () => this.togglePanel());
        const closeBtn = document.getElementById('btn-settings-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.togglePanel());

        const sizeDown = document.getElementById('btn-size-down');
        if (sizeDown) {
            sizeDown.addEventListener('click', () => {
                this.appSize = Math.max(32, this.appSize - 8);
                this.panelScale = Math.max(0.5, this.panelScale - 0.1);
                this.updateStyles();
                this.saveSettings();
            });
        }
        const sizeUp = document.getElementById('btn-size-up');
        if (sizeUp) {
            sizeUp.addEventListener('click', () => {
                this.appSize = Math.min(160, this.appSize + 8);
                this.panelScale = Math.min(2.0, this.panelScale + 0.1);
                this.updateStyles();
                this.saveSettings();
            });
        }

        const textDown = document.getElementById('btn-text-down');
        if (textDown) {
            textDown.addEventListener('click', () => {
                this.textSize = Math.max(10, this.textSize - 2);
                this.updateStyles();
                this.saveSettings();
            });
        }
        const textUp = document.getElementById('btn-text-up');
        if (textUp) {
            textUp.addEventListener('click', () => {
                this.textSize = Math.min(32, this.textSize + 2);
                this.updateStyles();
                this.saveSettings();
            });
        }

        // Theme Bindings
        ['btn-theme-normal', 'btn-theme-legacy', 'btn-theme-ares-rb', 'btn-theme-ares-rw', 'btn-theme-ares-bw'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    const theme = id === 'btn-theme-normal' ? null : id.replace('btn-theme-', '');
                    this.applyTheme(theme);
                    this.saveSettings();
                });
            }
        });

        const mirrorBtn = document.getElementById('btn-mirror-toggle');
        if (mirrorBtn) {
            mirrorBtn.addEventListener('click', () => {
                this.isMirrored = !this.isMirrored;
                this.updateStyles();
                this.saveSettings();
            });
        }

        const cockpitBtn = document.getElementById('btn-cockpit-toggle');
        if (cockpitBtn) {
            cockpitBtn.addEventListener('click', () => {
                this.cockpitMode = !this.cockpitMode;
                document.body.classList.toggle('cockpit-mode', this.cockpitMode);
                cockpitBtn.innerText = this.cockpitMode ? 'Disengage Cockpit' : 'Engage Cockpit';
                cockpitBtn.classList.toggle('bg-blue-500/40', this.cockpitMode);
                this.saveSettings();
            });
        }

        // Skin Bindings
        ['btn-skin-rb', 'btn-skin-blue', 'btn-skin-rw', 'btn-skin-legacy'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.addEventListener('click', () => {
                    const skin = id.replace('btn-skin-', '');
                    this.applySkin(skin);
                    this.saveSettings();
                });
            }
        });

        const filterGridBtn = document.getElementById('btn-filter-grid');
        if (filterGridBtn) {
            filterGridBtn.addEventListener('click', () => {
                this.gridFilter = !this.gridFilter;
                document.body.classList.toggle('tron-legacy-grid', this.gridFilter);
                filterGridBtn.classList.toggle('bg-cyan-500/30', this.gridFilter);
                this.saveSettings();
            });
        }

        const borderColorPicker = document.getElementById('border-color-picker');
        if (borderColorPicker) {
            borderColorPicker.value = this.borderColor;
            borderColorPicker.addEventListener('input', (e) => {
                this.borderColor = e.target.value;
                this.updateStyles();
            });
            borderColorPicker.addEventListener('change', () => this.saveSettings());
        }

        const bgColorPicker = document.getElementById('bg-color-picker');
        if (bgColorPicker) {
            bgColorPicker.value = this.bgColor;
            bgColorPicker.addEventListener('input', (e) => {
                this.bgColor = e.target.value;
                this.bgImage = null; // Clear image when color picked
                this.updateStyles();
            });
            bgColorPicker.addEventListener('change', () => this.saveSettings());
        }

        const bgImageUpload = document.getElementById('bg-image-upload');
        if (bgImageUpload) {
            bgImageUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.bgImage = event.target.result;
                        this.updateStyles();
                        this.saveSettings();
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const privacyBtn = document.getElementById('btn-privacy-toggle');
        if (privacyBtn) {
            privacyBtn.addEventListener('click', () => {
                this.isPrivacyMode = !this.isPrivacyMode;
                this.updateStyles();
                this.saveSettings();
            });
        }
    }

    applyTheme(theme) {
        const allThemes = ['tron-legacy', 'tron-ares-rb', 'tron-ares-rw', 'tron-ares-bw'];
        document.body.classList.remove(...allThemes);
        this.activeTheme = theme;
        if (theme) {
            const themeClass = theme === 'legacy' ? 'tron-legacy' : `tron-${theme}`;
            document.body.classList.add(themeClass);
        }
        // Update UI
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'shadow-[0_0_15px_rgba(255,255,255,0.5)]'));
        const activeBtn = document.getElementById(`btn-theme-${theme || 'normal'}`);
        if (activeBtn) activeBtn.classList.add('ring-2', 'ring-white', 'shadow-[0_0_15px_rgba(255,255,255,0.5)]');
    }

    applySkin(skin) {
        const allSkins = ['skin-ares-rb', 'skin-ares-blue', 'skin-ares-rw', 'skin-legacy'];
        document.body.classList.remove(...allSkins);
        this.activeSkin = skin;
        const skinClass = skin === 'legacy' ? 'skin-legacy' : (skin === 'blue' ? 'skin-ares-blue' : `skin-ares-${skin}`);
        document.body.classList.add(skinClass);
        // Update UI
        document.querySelectorAll('[id^="btn-skin-"]').forEach(b => b.classList.remove('ring-2', 'ring-white', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]'));
        const activeBtn = document.getElementById(`btn-skin-${skin}`);
        if (activeBtn) activeBtn.classList.add('ring-2', 'ring-white', 'shadow-[0_0_20px_rgba(255,255,255,0.4)]');
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        this.setAppOpen(this.isOpen, 'settings');
        if (this.isOpen) {
            this.panel.classList.remove('hidden');
            setTimeout(() => {
                this.panel.classList.remove('opacity-0', 'pointer-events-none');
                this.panel.classList.add('opacity-100', 'pointer-events-auto');
            }, 10);
        } else {
            this.panel.classList.remove('opacity-100', 'pointer-events-auto');
            this.panel.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => this.panel.classList.add('hidden'), 500);
        }
    }

    updateStyles() {
        document.documentElement.style.setProperty('--app-size', `${this.appSize}px`);
        document.documentElement.style.setProperty('--panel-scale', `${this.panelScale}`);
        document.documentElement.style.setProperty('--text-size', `${this.textSize}px`);
        document.documentElement.style.setProperty('--mirror-scale', this.isMirrored ? '-1' : '1');
        
        if (this.bgImage) {
            document.body.style.backgroundImage = `url('${this.bgImage}')`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundPosition = 'center';
            document.body.style.backgroundColor = 'transparent';
        } else {
            document.body.style.backgroundImage = 'none';
            document.body.style.backgroundColor = this.bgColor;
        }
        document.documentElement.style.setProperty('--app-border-color', this.borderColor);
        
        const borderColorPicker = document.getElementById('border-color-picker');
        if (borderColorPicker) borderColorPicker.value = this.borderColor;
        const bgColorPicker = document.getElementById('bg-color-picker');
        if (bgColorPicker) bgColorPicker.value = this.bgColor;

        const mediaContainer = document.getElementById('media-container');
        const privacyBtn = document.getElementById('btn-privacy-toggle');
        const privacyDot = document.getElementById('privacy-dot');
        
        if (mediaContainer) {
            mediaContainer.style.opacity = this.isPrivacyMode ? '0' : '1';
            mediaContainer.style.pointerEvents = this.isPrivacyMode ? 'none' : 'auto';
        }
        
        if (privacyBtn && privacyDot) {
            privacyBtn.classList.toggle('bg-blue-500/30', this.isPrivacyMode);
            privacyDot.style.left = this.isPrivacyMode ? 'calc(100% - 20px)' : '4px';
            privacyDot.classList.toggle('bg-blue-400', this.isPrivacyMode);
            privacyDot.classList.toggle('shadow-[0_0_10px_#60a5fa]', this.isPrivacyMode);
        }
    }

    setAppOpen(isOpen, appName = null) {
        if (appName === 'music') {
            if (isOpen) document.body.classList.add('active-music');
            else document.body.classList.remove('active-music');
            const musicIcon = document.querySelector('.sidebar-toolbar [data-app="music"]');
            if (musicIcon) {
                if (isOpen) musicIcon.classList.add('active-app');
                else musicIcon.classList.remove('active-app');
            }
            return;
        }

        document.body.classList.remove('app-open', 'active-settings', 'active-map');
        const sidebarIcons = document.querySelectorAll('.sidebar-toolbar .interactable:not([data-app="music"])');
        sidebarIcons.forEach(icon => icon.classList.remove('active-app'));

        if (isOpen) {
            document.body.classList.add('app-open');
            if (appName) {
                document.body.classList.add(`active-${appName}`);
                const icon = document.querySelector(`.sidebar-toolbar [data-app="${appName}"]`);
                if (icon) icon.classList.add('active-app');
                else {
                    const btn = document.getElementById(`${appName}-btn`);
                    if (btn) btn.classList.add('active-app');
                }
            }
        }
    }
}
