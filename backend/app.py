from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as ort
import cv2
import numpy as np
import io
import base64
from PIL import Image
import os

app = Flask(__name__)
CORS(app)

# ─── Config ───
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Walk up one level from /api to the project root
PROJECT_ROOT = os.path.dirname(BASE_DIR)
WEIGHTS_DIR = os.path.join(PROJECT_ROOT, "private", "pesos")

INPUT_SIZE = 640  # YOLOv8 default input size

# ─── Load ONNX Sessions (one per model) ───
sessions = {}

def load_session(name, rel_path):
    """Safely load an ONNX model session."""
    full_path = os.path.join(WEIGHTS_DIR, rel_path)
    try:
        sess = ort.InferenceSession(full_path, providers=["CPUExecutionProvider"])
        sessions[name] = sess
        print(f"[OK] Modelo cargado: {name} ({rel_path})")
    except Exception as e:
        print(f"[WARN] No se pudo cargar {name}: {e}")

load_session("cerebro", os.path.join("cerebro", "bestCerebro.onnx"))
load_session("celulas", os.path.join("celulas", "best.onnx"))
load_session("pulmones", os.path.join("pulmones", "best.onnx"))


# ─── Helpers ───

def preprocess(image_bgr, size=INPUT_SIZE):
    """
    Resize + pad image to (size x size), normalize to [0,1], 
    return (blob, ratio, pad_w, pad_h) for coordinate rescaling.
    """
    h, w = image_bgr.shape[:2]
    ratio = min(size / h, size / w)
    new_w, new_h = int(w * ratio), int(h * ratio)
    resized = cv2.resize(image_bgr, (new_w, new_h))

    # Pad to square
    pad_w = (size - new_w) // 2
    pad_h = (size - new_h) // 2
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    canvas[pad_h:pad_h + new_h, pad_w:pad_w + new_w] = resized

    # HWC → CHW, BGR → RGB, float32, batch dim
    blob = canvas[:, :, ::-1].astype(np.float32) / 255.0
    blob = np.transpose(blob, (2, 0, 1))[np.newaxis, ...]
    return blob, ratio, pad_w, pad_h


def postprocess(output, ratio, pad_w, pad_h, conf_thresh=0.5, iou_thresh=0.45):
    """
    Parse YOLOv8 ONNX output (1, 84, 8400) → list of (x1,y1,x2,y2, conf, class_id).
    Applies confidence filter + NMS.
    """
    # output shape is (1, num_features, num_preds) → transpose to (num_preds, num_features)
    preds = np.squeeze(output).T  # (8400, 84) for 80-class COCO or custom classes

    num_classes = preds.shape[1] - 4  # first 4 cols are cx, cy, w, h

    # Extract boxes (cx, cy, w, h) and class scores
    cx, cy, bw, bh = preds[:, 0], preds[:, 1], preds[:, 2], preds[:, 3]
    class_scores = preds[:, 4:]  # (8400, num_classes)

    # Best class per prediction
    class_ids = np.argmax(class_scores, axis=1)
    confs = np.max(class_scores, axis=1)

    # Filter by confidence
    mask = confs > conf_thresh
    cx, cy, bw, bh = cx[mask], cy[mask], bw[mask], bh[mask]
    confs = confs[mask]
    class_ids = class_ids[mask]

    if len(confs) == 0:
        return []

    # Convert cx,cy,w,h → x1,y1,x2,y2
    x1 = cx - bw / 2
    y1 = cy - bh / 2
    x2 = cx + bw / 2
    y2 = cy + bh / 2

    # Rescale to original image coordinates
    x1 = (x1 - pad_w) / ratio
    y1 = (y1 - pad_h) / ratio
    x2 = (x2 - pad_w) / ratio
    y2 = (y2 - pad_h) / ratio

    boxes = np.stack([x1, y1, x2, y2], axis=1).astype(np.float32)

    # NMS (OpenCV-based, no torch needed)
    indices = cv2.dnn.NMSBoxes(
        bboxes=boxes.tolist(),
        scores=confs.tolist(),
        score_threshold=conf_thresh,
        nms_threshold=iou_thresh,
    )

    results = []
    if len(indices) > 0:
        indices = indices.flatten()
        for i in indices:
            results.append({
                "box": boxes[i].tolist(),
                "conf": float(confs[i]),
                "class_id": int(class_ids[i]),
            })
    return results


def run_inference(session, image_bgr, conf=0.5):
    """Run ONNX inference and return detections."""
    blob, ratio, pad_w, pad_h = preprocess(image_bgr)
    input_name = session.get_inputs()[0].name
    output = session.run(None, {input_name: blob})[0]
    return postprocess(output, ratio, pad_w, pad_h, conf_thresh=conf)


# ─── Class name mappings per model ───
CEREBRO_NAMES = {0: "Glioma", 1: "Meningioma", 2: "No Tumor", 3: "Pituitary"}
CELULAS_NAMES = {0: "Basófilo", 1: "Eosinófilo", 2: "Eritroblasto", 3: "Linfocito",
                 4: "Monocito", 5: "Neutrófilo", 6: "Plaqueta"}
PULMONES_NAMES = {
    0: "Atelectasia", 1: "Cardiomegalia", 2: "Consolidación", 3: "Edema",
    4: "Efusión Pleural", 5: "Enfisema", 6: "Fibrosis", 7: "Hernia",
    8: "Infiltración", 9: "Masa", 10: "Nódulo", 11: "Engrosamiento Pleural",
    12: "Neumotórax", 13: "Neumonía"
}


# ─── API Route ───

@app.route("/api/analyze", methods=["POST"])
def analyze_image():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    patology_type = request.form.get("type", "cerebro")

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Check model availability
    if patology_type not in sessions:
        return jsonify({
            "diagnostico": f"MODELO '{patology_type.upper()}' NO DISPONIBLE",
            "color": "gray",
            "image_base64": None,
        })

    session = sessions[patology_type]

    # Read and decode image
    image_bytes = file.read()
    image_rgb = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
    img_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

    # Choose name map + confidence threshold
    if patology_type == "cerebro":
        names = CEREBRO_NAMES
        conf = 0.5
    elif patology_type == "celulas":
        names = CELULAS_NAMES
        conf = 0.25
    else:
        names = PULMONES_NAMES
        conf = 0.3

    # Inference
    detections = run_inference(session, img_bgr, conf=conf)

    # Classify results
    is_positive = False
    detected_classes = []

    for det in detections:
        label = names.get(det["class_id"], "Anomalía")

        # For cerebro, "No Tumor" means healthy
        if patology_type == "cerebro" and label.lower() == "no tumor":
            continue

        is_positive = True
        detected_classes.append(label.upper())

        # Draw bounding box
        x1, y1, x2, y2 = map(int, det["box"])
        if patology_type == "celulas":
            stroke_color = (139, 0, 255)  # Magenta
        elif patology_type == "pulmones":
            stroke_color = (0, 165, 255)  # Naranja
        else:
            stroke_color = (0, 0, 255)    # Rojo

        cv2.rectangle(img_bgr, (x1, y1), (x2, y2), stroke_color, 3)

        # Label + confidence
        conf_text = f"{label} {det['conf']:.0%}"
        (tw, th), _ = cv2.getTextSize(conf_text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(img_bgr, (x1, y1 - th - 10), (x1 + tw + 6, y1), stroke_color, -1)
        cv2.putText(img_bgr, conf_text, (x1 + 3, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

    # Build diagnosis string
    if is_positive:
        unique_classes = list(set(detected_classes))
        diagnostico = f"POSITIVO - {', '.join(unique_classes)}"
        color = "red"
    else:
        if patology_type == "cerebro":
            diagnostico = "NEGATIVO - NO SE DETECTARON TUMORES"
        elif patology_type == "celulas":
            diagnostico = "NEGATIVO - PATRÓN CELULAR SALUDABLE"
        else:
            diagnostico = "NEGATIVO - SIN ANOMALÍAS PULMONARES"
        color = "green"

    # Encode result image to base64
    _, buffer = cv2.imencode(".jpg", img_bgr)
    img_base64 = base64.b64encode(buffer).decode("utf-8")

    return jsonify({
        "diagnostico": diagnostico,
        "color": color,
        "image_base64": f"data:image/jpeg;base64,{img_base64}",
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
