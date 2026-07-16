from flask import Flask, render_template, request, jsonify
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import base64
import cv2

app = Flask(__name__)

# Load model
model = tf.keras.models.load_model("model/handwritten_digit_model.keras")


@app.route("/")
def home():
    return render_template("index.html")


def preprocess_image(image):

    # ── Convert to numpy RGB ───────────────────────────────────
    img_rgb = np.array(image.convert("RGB"))
    gray_img = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    img_hsv  = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV)

    h, w = gray_img.shape

    # ── Detect image type: dark-bg (canvas) vs light-bg (photo) ──
    # Sample border pixels to estimate background brightness
    border_pixels = np.concatenate([
        gray_img[0, :], gray_img[-1, :],
        gray_img[:, 0], gray_img[:, -1]
    ])
    bg_is_dark = np.mean(border_pixels) < 127

    if bg_is_dark:
        # ── Dark background (canvas drawing) ──────────────────
        # White/bright digit on black bg — just threshold directly
        _, ink_mask = cv2.threshold(gray_img, 40, 255, cv2.THRESH_BINARY)

    else:
        # ── Light background (photo / upload) ─────────────────
        # Strategy: build ink mask from multiple color ranges,
        # then keep only the largest blob (the digit)

        combined = np.zeros((h, w), dtype=np.uint8)

        # 1. Blue / blue-black ink
        blue = cv2.inRange(img_hsv,
            np.array([85,  25,  15]),
            np.array([150, 255, 210]))
        combined = cv2.bitwise_or(combined, blue)

        # 2. Black / very dark ink (any hue, low value)
        dark = cv2.inRange(img_hsv,
            np.array([0,   0,   0]),
            np.array([180, 255, 90]))
        combined = cv2.bitwise_or(combined, dark)

        # 3. Red / dark red ink
        red1 = cv2.inRange(img_hsv, np.array([0,  60, 20]), np.array([10, 255, 180]))
        red2 = cv2.inRange(img_hsv, np.array([165,60, 20]), np.array([180,255, 180]))
        combined = cv2.bitwise_or(combined, cv2.bitwise_or(red1, red2))

        # 4. Pencil / gray (low saturation, medium-dark value)
        pencil = cv2.inRange(img_hsv,
            np.array([0,  0,   0]),
            np.array([180, 40, 160]))
        # Only keep pencil pixels darker than local neighbourhood
        # (avoids treating the paper itself as pencil)
        local_mean = cv2.blur(gray_img, (21, 21)).astype(np.int16)
        is_darker  = ((gray_img.astype(np.int16) - local_mean) < -12).astype(np.uint8) * 255
        pencil     = cv2.bitwise_and(pencil, is_darker)
        combined   = cv2.bitwise_or(combined, pencil)

        ink_mask = combined

    # ── Morphological clean-up ─────────────────────────────────
    k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    ink_mask = cv2.morphologyEx(ink_mask, cv2.MORPH_OPEN,  k3, iterations=1)
    ink_mask = cv2.morphologyEx(ink_mask, cv2.MORPH_CLOSE, k3, iterations=2)

    # ── Find largest connected component ──────────────────────
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(
        ink_mask, connectivity=8)

    if num_labels > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        largest_idx = int(np.argmax(areas)) + 1
        digit_mask = np.where(labels == largest_idx, 255, 0).astype(np.uint8)
    else:
        # Last-resort fallback: Otsu on inverted grayscale
        inv = cv2.bitwise_not(gray_img) if not bg_is_dark else gray_img
        _, digit_mask = cv2.threshold(inv, 0, 255,
                                      cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # ── Crop tightly with padding ──────────────────────────────
    coords = np.argwhere(digit_mask > 0)
    if coords.size == 0:
        return np.zeros((1, 28, 28, 1), dtype="float32")

    y0, x0 = coords.min(axis=0)
    y1, x1 = coords.max(axis=0)
    pad = 6
    y0 = max(0,   y0 - pad)
    x0 = max(0,   x0 - pad)
    y1 = min(h-1, y1 + pad)
    x1 = min(w-1, x1 + pad)
    cropped = digit_mask[y0:y1+1, x0:x1+1]

    # ── Resize to 20×20, center on 28×28 black canvas ─────────
    pil_digit = Image.fromarray(cropped)
    pil_digit.thumbnail((20, 20), Image.LANCZOS)

    canvas_img = Image.new("L", (28, 28), 0)
    px = (28 - pil_digit.width)  // 2
    py = (28 - pil_digit.height) // 2
    canvas_img.paste(pil_digit, (px, py))

    img_out = np.array(canvas_img).astype("float32") / 255.0
    return img_out.reshape(1, 28, 28, 1)


@app.route("/predict", methods=["POST"])
def predict():

    data = request.json.get("image")

    if data is None:
        return jsonify({"error": "No image received"}), 400

    image_data = data.split(",")[1]

    image_bytes = base64.b64decode(image_data)

    image = Image.open(io.BytesIO(image_bytes))

    img = preprocess_image(image)

    prediction = model.predict(img, verbose=0)

    digit = int(np.argmax(prediction))

    confidence = float(np.max(prediction) * 100)

    probs = [round(float(x * 100), 2) for x in prediction[0]]

    return jsonify({
        "prediction": digit,
        "confidence": round(confidence, 2),
        "all_probs": probs
    })


@app.route("/debug", methods=["POST"])
def debug():
    data = request.json.get("image")
    image_data = data.split(",")[1]
    image_bytes = base64.b64decode(image_data)
    image = Image.open(io.BytesIO(image_bytes))
    img_array = preprocess_image(image)
    preview = Image.fromarray((img_array[0,:,:,0]*255).astype(np.uint8), "L")
    buf = io.BytesIO()
    preview.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return jsonify({"preview": "data:image/png;base64," + b64})

if __name__ == "__main__":
    app.run(debug=True)