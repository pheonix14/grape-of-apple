from PIL import Image
import os

source_path = r"C:\Users\acer\.gemini\pheonix14\brain\18b24130-0799-4e4d-833e-f5dbb66929df\grape_favicon_source_1777735822599.png"
target_path = r"c:\Users\acer\Desktop\grape x51x\static\favicon.ico"

try:
    img = Image.open(source_path)
    # Resize and save as icon
    icon_sizes = [(16, 16), (32, 32), (48, 48), (64, 64)]
    img.save(target_path, sizes=icon_sizes)
    print(f"Success: {target_path} created.")
except Exception as e:
    print(f"Error: {e}")
