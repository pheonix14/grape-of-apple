class ThemeEngine:
    THEMES = {
        "normal": {"name": "Normal Glass", "class": ""},
        "legacy": {"name": "Tron Legacy", "class": "tron-legacy"},
        "ares-rb": {"name": "Ares Red/Black", "class": "tron-ares-rb"},
        "ares-rw": {"name": "Ares Red/White", "class": "tron-ares-rw"},
        "ares-bw": {"name": "Ares Blue/White", "class": "tron-ares-bw"}
    }

    SKINS = {
        "default": {"name": "Default Glass", "class": ""},
        "ares-rb": {"name": "Ares RB", "class": "skin-ares-rb"},
        "ares-blue": {"name": "Ares Blue", "class": "skin-ares-blue"},
        "ares-rw": {"name": "Ares RW", "class": "skin-ares-rw"},
        "legacy": {"name": "Legacy Cyan", "class": "skin-legacy"}
    }

    DEFAULT_CONFIG = {
        "appSize": 64,
        "panelScale": 1.0,
        "textSize": 16,
        "isMirrored": True,
        "activeTheme": None,
        "activeSkin": "default",
        "gridFilter": False,
        "cockpitMode": False,
        "borderColor": "#ffffff",
        "bgColor": "#000000",
        "bgImage": None,
        "isPrivacyMode": False
    }

    @classmethod
    def get_presets(cls) -> dict:
        return {
            "themes": cls.THEMES,
            "skins": cls.SKINS,
            "defaults": cls.DEFAULT_CONFIG
        }

    @classmethod
    def sanitize_settings(cls, settings: dict) -> dict:
        if not isinstance(settings, dict):
            return cls.DEFAULT_CONFIG.copy()
        merged = cls.DEFAULT_CONFIG.copy()
        merged.update(settings)
        return merged
