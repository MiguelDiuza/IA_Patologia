from flask import Flask, request, jsonify
from flask_cors import CORS
import onnxruntime as ort
import cv2
import numpy as np
import io
import base64
from PIL import Image
import os

import traceback

app = Flask(__name__)
CORS(app)

# ─── Config ───
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# If BASE_DIR ends with 'api', project root is one level up
if os.path.basename(BASE_DIR) == 'api':
    PROJECT_ROOT = os.path.dirname(BASE_DIR)
else:
    PROJECT_ROOT = BASE_DIR

WEIGHTS_DIR = os.path.join(PROJECT_ROOT, "private", "pesos")

print(f"[*] BASE_DIR: {BASE_DIR}")
print(f"[*] PROJECT_ROOT: {PROJECT_ROOT}")
print(f"[*] WEIGHTS_DIR: {WEIGHTS_DIR}")

@app.errorhandler(500)
def handle_500(e):
    return jsonify({"error": "Internal Server Error", "traceback": traceback.format_exc()}), 500

INPUT_SIZE = 640  # YOLOv8 default input size

# ─── Load ONNX Sessions (one per model) ───
sessions = {}

def load_session(name, rel_path):
    """Safely load an ONNX model session."""
    full_path = os.path.normpath(os.path.join(WEIGHTS_DIR, rel_path))
    if not os.path.exists(full_path):
        print(f"[FAIL] No existe el archivo: {full_path}")
        return
    try:
        sess = ort.InferenceSession(full_path, providers=["CPUExecutionProvider"])
        sessions[name] = sess
        print(f"[OK] Modelo '{name}' cargado con éxito desde {full_path}")
    except Exception as e:
        print(f"[FAIL] Error cargando modelo '{name}': {e}")

load_session("cerebro", os.path.join("cerebro", "bestCerebro.onnx"))
load_session("celulas", os.path.join("celulas", "best.onnx"))
load_session("pulmones", os.path.join("pulmones", "best.onnx"))


def get_input_details(session):
    """Retrieve input name and expected shape from ONNX session."""
    input_node = session.get_inputs()[0]
    input_name = input_node.name
    input_shape = input_node.shape # e.g. [1, 3, 640, 640]
    
    # Handle dynamic shapes or standard 640
    width = input_shape[3] if isinstance(input_shape[3], int) else 640
    height = input_shape[2] if isinstance(input_shape[2], int) else 640
    return input_name, width, height

def preprocess(image_bgr, target_w, target_h):
    """Resize + pad image to target size, normalize to [0,1]."""
    h, w = image_bgr.shape[:2]
    scale = min(target_w / w, target_h / h)
    nw, nh = int(w * scale), int(h * scale)
    
    img_resized = cv2.resize(image_bgr, (nw, nh))
    
    # Create canvas and pad
    canvas = np.full((target_h, target_w, 3), 114, dtype=np.uint8)
    pad_w = (target_w - nw) // 2
    pad_h = (target_h - nh) // 2
    canvas[pad_h:pad_h + nh, pad_w:pad_w + nw] = img_resized
    
    # BGR to RGB and Normalize
    blob = canvas[:, :, ::-1].transpose(2, 0, 1) # HWC to CHW
    blob = np.expand_dims(blob, axis=0).astype(np.float32) / 255.0
    return blob, scale, pad_w, pad_h


def postprocess(output, scale, pad_w, pad_h, conf_thresh=0.2, iou_thresh=0.45):
    """
    Detailed YOLOv8 ONNX parser. 
    YOLOv8 output is usually (1, 4+classes, 8400)
    """
    if isinstance(output, (list, tuple)):
        output = output[0]
        
    preds = np.squeeze(output)
    if preds.shape[0] < preds.shape[1]:
        preds = preds.T # Ensure shape is (8400, 4+classes)

    # DEBUG: Ver el rango de confianza real del modelo
    all_confs = np.max(preds[:, 4:], axis=1)
    max_conf = np.max(all_confs)
    print(f"[*] Depuración: Confianza máxima encontrada en toda la imagen: {max_conf:.4f}")

    # Start filtering
    boxes_raw = preds[:, :4] 
    scores = preds[:, 4:]
    
    class_ids = np.argmax(scores, axis=1)
    confs = np.max(scores, axis=1)
    
    mask = confs > conf_thresh
    boxes_raw = boxes_raw[mask]
    confs = confs[mask]
    class_ids = class_ids[mask]
    
    if len(confs) == 0:
        return []

    # YOLOv8 format: [cx, cy, w, h] in pixels of the input size (e.g. 640)
    x = (boxes_raw[:, 0] - boxes_raw[:, 2] / 2 - pad_w) / scale
    y = (boxes_raw[:, 1] - boxes_raw[:, 3] / 2 - pad_h) / scale
    w = boxes_raw[:, 2] / scale
    h = boxes_raw[:, 3] / scale
    
    nms_boxes = np.stack([x, y, w, h], axis=1).tolist()
    
    # NMS
    indices = cv2.dnn.NMSBoxes(nms_boxes, confs.tolist(), conf_thresh, iou_thresh)
    
    results = []
    if len(indices) > 0:
        idx_list = indices.flatten() if hasattr(indices, 'flatten') else indices
        for idx in idx_list:
            b = nms_boxes[idx]
            results.append({
                "box": [b[0], b[1], b[0] + b[2], b[1] + b[3]],
                "conf": float(confs[idx]),
                "class_id": int(class_ids[idx])
            })
    return results


def run_inference(session, image_bgr, conf=0.2):
    """Run ONNX session with dynamic input sizing."""
    try:
        input_name, tw, th = get_input_details(session)
        blob, scale, pad_w, pad_h = preprocess(image_bgr, tw, th)
        
        output = session.run(None, {input_name: blob})
        return postprocess(output, scale, pad_w, pad_h, conf_thresh=conf)
    except Exception as e:
        print(f"[ERROR] Inferencia fallida: {e}")
        return []


# ─── Mapeos de Clases (Sin tildes para evitar errores de renderizado) ───
CEREBRO_NAMES = {0: 'Glioma', 1: 'Meningioma', 2: 'No Tumor', 3: 'Pituitaria'}

# Células
CELULAS_NAMES = {0: 'Celula Atipica', 1: 'Celula Atipica'}

# Pulmones (Sin tildes)
PULMONES_NAMES = {
    0: 'Agrandamiento Aortico', 1: 'Atelectasia', 2: 'Calcificacion', 
    3: 'Cardiomegalia', 4: 'Consolidacion', 5: 'Enf. Intersticial', 6: 'Infiltracion', 
    7: 'Opacidad Pulmonar', 8: 'Nodulo o Masa', 9: 'Otra Lesion', 
    10: 'Derrame Pleural', 11: 'Engrosamiento Pleural', 12: 'Neumotorax', 
    13: 'Sin Hallazgos'
}


# ─── RUTA API ───

@app.route("/api/analyze", methods=["POST"])
def analyze_image():
    print(f"\n--- Nueva Solicitud de Análisis ---")
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        patology_type = request.form.get("type", "cerebro")
        print(f"[*] Analizando: {patology_type.upper()}")

        if file.filename == "":
            return jsonify({"error": "No file selected"}), 400

        if patology_type not in sessions:
            return jsonify({"error": "Modelo no cargado"}), 500

        session = sessions[patology_type]

        # Leer imagen
        image_bytes = file.read()
        image_rgb = np.array(Image.open(io.BytesIO(image_bytes)).convert("RGB"))
        img_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

        # Ajustar confianza según modelo
        conf = 0.15 if patology_type == "celulas" else 0.25

        # Inferencia
        detections = run_inference(session, img_bgr, conf=conf)
        print(f"[*] Detecciones finales tras NMS: {len(detections)}")

        # Select correct class names dictionary
        if patology_type == "cerebro":
            names = CEREBRO_NAMES
        elif patology_type == "celulas":
            names = CELULAS_NAMES
        else:
            names = PULMONES_NAMES

        is_positive = False
        detected_labels = []

        for det in detections:
            label = names.get(det["class_id"], f"Hallazgo {det['class_id']}")

            # Filtro de sanidad según modelo
            if patology_type == "cerebro" and label.lower() == "no tumor": continue
            if patology_type == "pulmones" and (label.lower() == "sin hallazgos" or det["class_id"] == 13): continue

            is_positive = True
            detected_labels.append(label.upper())

            # Dibujar resultados
            x1, y1, x2, y2 = map(int, det["box"])
            
            # Colores Neón (BGR)
            if patology_type == "celulas":
                stroke = (255, 0, 255) # Fucsia para células
            elif patology_type == "pulmones":
                stroke = (0, 165, 255) # NARANJA vibrante para pulmones
            else:
                stroke = (0, 0, 255) # Rojo para cerebro

            # Dibujar caja
            cv2.rectangle(img_bgr, (x1, y1), (x2, y2), stroke, 3)
            
            # Etiqueta de texto
            txt = f"{label} {det['conf']:.0%}"
            (tw, th), _ = cv2.getTextSize(txt, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(img_bgr, (x1, y1 - th - 10), (x1 + tw + 10, y1), stroke, -1)
            cv2.putText(img_bgr, txt, (x1 + 5, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)

        # Build final diagnosis
        if is_positive:
            diagnostico = f"POSITIVO - {', '.join(list(set(detected_labels)))}"
            color = "red"
        else:
            diagnostico = "NEGATIVO - PATRÓN NORMAL"
            color = "green"

        # Base64 output
        _, buffer = cv2.imencode(".jpg", img_bgr)
        img_base64 = base64.b64encode(buffer).decode("utf-8")
        print(f"[*] Diagnóstico: {diagnostico}")

        return jsonify({
            "diagnostico": diagnostico,
            "color": color,
            "image_base64": f"data:image/jpeg;base64,{img_base64}",
        })
    except Exception as e:
        print(f"[FATAL ERROR] {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500


if __name__ == "__main__":
    print("[*] Iniciando servidor Flask en puerto 5000...")
    app.run(debug=True, host="127.0.0.1", port=5000)
