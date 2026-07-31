class SkinHandler:
    SKIN_PRESETS = {
        "default": {
            "name": "Default Glass",
            "bg": "rgba(255, 255, 255, 0.1)",
            "border": "rgba(255, 255, 255, 0.2)",
            "text": "#ffffff",
            "hover": "rgba(255, 255, 255, 0.2)"
        },
        "ares-rb": {
            "name": "Ares RB",
            "bg": "rgba(255, 0, 60, 0.1)",
            "border": "#ff003c",
            "text": "#ff003c",
            "hover": "rgba(255, 0, 60, 0.25)"
        },
        "ares-blue": {
            "name": "Ares Blue",
            "bg": "rgba(0, 100, 255, 0.1)",
            "border": "#0064ff",
            "text": "#0064ff",
            "hover": "rgba(0, 100, 255, 0.25)"
        },
        "ares-rw": {
            "name": "Ares RW",
            "bg": "rgba(255, 255, 255, 0.1)",
            "border": "#ff003c",
            "text": "#ff003c",
            "hover": "rgba(255, 255, 255, 0.25)"
        },
        "legacy": {
            "name": "Legacy Cyan",
            "bg": "rgba(0, 255, 255, 0.1)",
            "border": "#00ffff",
            "text": "#00ffff",
            "hover": "rgba(0, 255, 255, 0.25)"
        }
    }

    @classmethod
    def get_presets(cls) -> dict:
        return cls.SKIN_PRESETS

    @classmethod
    def validate_skin(cls, skin_id: str) -> str:
        if not skin_id or skin_id not in cls.SKIN_PRESETS:
            return "default"
        return skin_id

    @classmethod
    def get_skin_css_vars(cls, skin_id: str) -> dict:
        skin = cls.SKIN_PRESETS.get(cls.validate_skin(skin_id))
        return {
            "--btn-skin-bg": skin["bg"],
            "--btn-skin-border": skin["border"],
            "--btn-skin-text": skin["text"],
            "--btn-skin-hover": skin["hover"]
        }
