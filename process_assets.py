import os
from PIL import Image
import numpy as np

def make_transparent_smooth(input_path, output_path, bg_threshold=242, feather_range=18):
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img, dtype=np.float32)
    
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    min_rgb = np.minimum(np.minimum(r, g), b)
    max_rgb = np.maximum(np.maximum(r, g), b)
    color_dist = max_rgb - min_rgb
    brightness = (r + g + b) / 3.0
    
    alpha = np.ones_like(brightness) * 255.0
    low_thresh = bg_threshold - feather_range
    high_thresh = bg_threshold
    
    # Whiteness / near-white neutral background check
    mask = (brightness >= low_thresh) & (color_dist < 22)
    fade_factor = (brightness - low_thresh) / (high_thresh - low_thresh + 1e-5)
    fade_factor = np.clip(fade_factor, 0.0, 1.0)
    
    alpha[mask] = (1.0 - fade_factor[mask]) * 255.0
    alpha[(brightness >= high_thresh) & (color_dist < 22)] = 0.0
    
    # Also kill extremely faint shadows that expand the bbox unnecessarily
    alpha[alpha < 15] = 0.0
    
    new_data = np.zeros_like(data, dtype=np.uint8)
    new_data[:, :, 0] = np.clip(r, 0, 255).astype(np.uint8)
    new_data[:, :, 1] = np.clip(g, 0, 255).astype(np.uint8)
    new_data[:, :, 2] = np.clip(b, 0, 255).astype(np.uint8)
    new_data[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    
    result = Image.fromarray(new_data, mode="RGBA")
    
    # Tight crop based on alpha > 25
    solid_mask = result.split()[-1].point(lambda p: 255 if p > 25 else 0)
    bbox = solid_mask.getbbox()
    if bbox:
        w, h = result.size
        pad = 8
        cropped_bbox = (max(0, bbox[0]-pad), max(0, bbox[1]-pad), min(w, bbox[2]+pad), min(h, bbox[3]+pad))
        result = result.crop(cropped_bbox)
        
    result.save(output_path, "PNG")
    print(f"Processed: {input_path} -> {output_path} (size: {result.size})")

# Process pillars
for i in range(1, 5):
    jpg_path = f"c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/pillars/pillar_{i}.jpg"
    png_path = f"c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/pillars/pillar_clean_{i}.png"
    if os.path.exists(jpg_path):
        make_transparent_smooth(jpg_path, png_path, bg_threshold=242, feather_range=18)

# Process decor
decor_files = [
    ("c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/leaf_left.jpg",
     "c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/leaf_left_clean.png", 242, 22),
    ("c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/leaf_small.jpg",
     "c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/leaf_small_clean.png", 242, 22),
    ("c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/potted_plant.jpg",
     "c:/Users/Aayush upadhyay/OneDrive/Desktop/Deloitte/Automated JET/frontend/public/decor/potted_plant_clean.png", 242, 20),
]

for in_p, out_p, thresh, feather in decor_files:
    if os.path.exists(in_p):
        make_transparent_smooth(in_p, out_p, bg_threshold=thresh, feather_range=feather)
