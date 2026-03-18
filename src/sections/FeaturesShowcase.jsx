import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { showcaseData } from "../data/showcaseData";
import { Upload, CheckCircle2, Loader2, Info } from "lucide-react";
import * as ort from "onnxruntime-web";

// Configuración de WASM desde CDN
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";

const CEREBRO_NAMES = { 0: 'Glioma', 1: 'Meningioma', 2: 'Sano', 3: 'Pituitaria' };
const CELULAS_NAMES = { 0: 'Celula Atipica', 1: 'Celula Atipica' };
const PULMONES_NAMES = {
  0: 'Agrandamiento Aortico', 1: 'Atelectasia', 2: 'Calcificacion', 3: 'Cardiomegalia', 
  4: 'Consolidacion', 5: 'Derrame', 6: 'Enf. Intersticial', 7: 'Infiltracion', 
  8: 'Opacidad', 9: 'Nodulo', 10: 'Otra Lesion', 11: 'Efusiòn', 
  12: 'Engrosamiento', 13: 'Neumotorax', 14: 'Sano'
};

export default function FeaturesShowcase() {
  const [selectedId, setSelectedId] = useState(showcaseData[0].id);
  const selected = showcaseData.find((s) => s.id === selectedId);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedImage, setAnalyzedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisColor, setAnalysisColor] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const sessionRef = useRef(null);

  useEffect(() => {
    setAnalyzedImage(null);
    setAnalysisResult(null);
    setAnalysisColor(null);
    sessionRef.current = null;
  }, [selectedId]);

  const preprocess = async (canvas, targetW, targetH) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const { data } = imageData;
    const input = new Float32Array(targetW * targetH * 3);
    for (let i = 0; i < data.length; i += 4) {
      const p = i / 4;
      input[p] = data[i] / 255.0;
      input[p + targetW * targetH] = data[i + 1] / 255.0;
      input[p + 2 * targetW * targetH] = data[i + 2] / 255.0;
    }
    return new ort.Tensor("float32", input, [1, 3, targetH, targetW]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLoadingMsg("Iniciando motor neuronal...");

    try {
      const pathologyType = { 1: "cerebro", 2: "celulas", 3: "pulmones" }[selectedId];
      const modelPath = `/models/${pathologyType}/model.onnx`;

      if (!sessionRef.current) {
        setLoadingMsg("Preparando IA local...");
        sessionRef.current = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
      }
      
      const session = sessionRef.current;
      
      const CONFIGS = {
        cerebro: { w: 416, h: 416, elements: 3549, stride: 8 },
        celulas: { w: 416, h: 416, elements: 3549, stride: 6 },
        pulmones: { w: 512, h: 512, elements: 5376, stride: 18 }
      };

      const cfg = CONFIGS[pathologyType];
      const modelW = cfg.w;
      const modelH = cfg.h;
      const totalElements = cfg.elements;
      const stride = cfg.stride;

      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(r => (img.onload = r));

      const canvas = document.createElement("canvas");
      canvas.width = modelW;
      canvas.height = modelH;
      const ctx = canvas.getContext("2d");
      const scale = Math.min(modelW / img.width, modelH / img.height);
      const nw = img.width * scale, nh = img.height * scale;
      const dx = (modelW - nw) / 2, dy = (modelH - nh) / 2;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, modelW, modelH);
      ctx.drawImage(img, dx, dy, nw, nh);

      const tensor = await preprocess(canvas, modelW, modelH);
      const results = await session.run({ [session.inputNames[0]]: tensor });
      const output = results[session.outputNames[0]].data;

      const numClasses = stride - 4;
      let rawDetections = [];
      const thresh = 0.15;

      for (let i = 0; i < totalElements; i++) {
        let maxS = 0, cls = -1;
        for (let c = 0; c < numClasses; c++) {
          const s = output[i + (4 + c) * totalElements];
          if (s > maxS) { maxS = s; cls = c; }
        }
        if (maxS > thresh) {
          rawDetections.push({
            box: [
              (output[i] - dx) / scale,
              (output[i + totalElements] - dy) / scale,
              output[i + 2 * totalElements] / scale,
              output[i + 3 * totalElements] / scale
            ],
            score: maxS, classId: cls
          });
        }
      }

      // NMS simplificado
      const detections = [];
      rawDetections.sort((a,b) => b.score - a.score).forEach(det => {
        const isOverwrite = detections.some(d => {
          const x1 = Math.max(det.box[0]-det.box[2]/2, d.box[0]-d.box[2]/2);
          const y1 = Math.max(det.box[1]-det.box[3]/2, d.box[1]-d.box[3]/2);
          const x2 = Math.min(det.box[0]+det.box[2]/2, d.box[0]+d.box[2]/2);
          const y2 = Math.min(det.box[1]+det.box[3]/2, d.box[1]+d.box[3]/2);
          const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
          return (inter / (det.box[2]*det.box[3])) > 0.45;
        });
        if (!isOverwrite) detections.push(det);
      });

      const resCanvas = document.createElement("canvas");
      resCanvas.width = img.width; resCanvas.height = img.height;
      const rCtx = resCanvas.getContext("2d");
      rCtx.drawImage(img, 0, 0);

      const names = pathologyType === "cerebro" ? CEREBRO_NAMES : (pathologyType === "celulas" ? CELULAS_NAMES : PULMONES_NAMES);
      let found = [], isPos = false;

      detections.slice(0, 10).forEach(det => {
        const label = names[det.classId] || "Hallazgo";
        if (pathologyType === "cerebro" && (label === "Sano" || det.classId === 2)) return;
        if (pathologyType === "pulmones" && (label === "Sano" || det.classId === 14)) return;

        isPos = true;
        found.push(label.toUpperCase());

        const cx = det.box[0], cy = det.box[1], w = det.box[2], h = det.box[3];
        const x1 = cx - w/2, y1 = cy - h/2;

        const color = pathologyType === "celulas" ? "#FF00FF" : (pathologyType === "pulmones" ? "#FFA500" : "#FF0000");
        rCtx.strokeStyle = color; rCtx.lineWidth = Math.max(4, img.width/200);
        rCtx.strokeRect(x1, y1, w, h);
        rCtx.fillStyle = color; rCtx.font = `bold ${Math.max(16, img.width/40)}px Arial`;
        const txt = `${label} ${(det.score*100).toFixed(0)}%`;
        const tw = rCtx.measureText(txt).width;
        rCtx.fillRect(x1, y1 - 35, tw+10, 35); rCtx.fillStyle = "white"; rCtx.fillText(txt, x1+5, y1-10);
      });

      setAnalysisResult(isPos ? `POSITIVO - ${[...new Set(found)].join(", ")}` : "NEGATIVO - PATRON NORMAL");
      setAnalysisColor(isPos ? "#EF4444" : "#10B981");
      setAnalyzedImage(resCanvas.toDataURL("image/jpeg", 0.95));

    } catch (err) {
      console.error("[ERROR] Fallo en motor:", err);
      setAnalysisResult("ERROR EN MOTOR LOCAL");
      setAnalysisColor("#94a3b8");
    } finally {
      setIsAnalyzing(false);
      setLoadingMsg("");
    }
  };

  return (
    <div className="py-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto overflow-hidden">
      <div className="mb-12 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Análisis de Patologías con AI</h2>
        <p className="text-lg text-slate-300 mb-6 leading-relaxed">
          Arrastra la imagen de tus exámenes y nuestra Inteligencia Artificial la procesará en segundos para proporcionarte un diagnóstico estructurado y preliminar.
        </p>
        <div className="flex items-center gap-3 justify-center mb-6 bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl max-w-lg mx-auto">
          <Info className="size-6 text-purple-400 shrink-0" />
          <p className="text-sm text-purple-200 leading-snug text-left">
            <strong>Privacidad Total:</strong> Procesamiento 100% local. <br/>
            Ningún dato sale de su navegador.
          </p>
        </div>
        <p className="text-sm text-center text-slate-500 bg-red-900/10 border border-red-500/20 p-4 rounded-xl leading-relaxed mx-auto max-w-full">
          * <strong className="text-red-400">Aviso médico importante:</strong> El diagnóstico proporcionado está basado en modelos matemáticos e inteligencia artificial previamente entrenada y <strong>no constituye un diagnóstico médico real</strong>. Siempre debes acudir a un profesional de la salud certificado para obtener exámenes y un diagnóstico oficial. Este sistema es exclusivamente una herramienta tecnológica de apoyo y no nos hacemos responsables de las decisiones clínicas o personales tomadas con base en estos resultados.
        </p>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-2xl text-purple-400 font-medium tracking-wide">
          Escoge una tarjeta según la patología que desees analizar
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto mb-24">
        {showcaseData.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <motion.div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              animate={{ scale: isSelected ? 1.05 : 0.95, filter: isSelected ? "grayscale(0%)" : "grayscale(100%) brightness(0.7) sepia(0.5) hue-rotate(250deg)" }}
              className={`relative cursor-pointer rounded-2xl overflow-hidden aspect-[4/5] border transition-colors duration-500 ${
                isSelected ? "border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4)]" : "border-slate-800 border-2"
              }`}
            >
              {isSelected && (
                <div className="absolute inset-0 z-10 pointer-events-none moving-border">
                  <div className="moving-border-content" style={{ borderRadius: "14px" }} />
                </div>
              )}
              <img src={item.image} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                <h3 className={`text-xl font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>{item.title}</h3>
                <p className={`text-sm mt-2 line-clamp-2 ${isSelected ? "text-slate-200" : "text-slate-500"}`}>{item.description}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={selectedId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8 border-r border-white/5 pr-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">{selected.title} Details</h2>
                <ul className="space-y-4">
                  {selected.info.map((info, idx) => (
                    <li key={idx} className="flex items-center gap-4 text-slate-300">
                      <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                      <span className="text-lg">{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div 
                className="bg-[#050510]/50 border-2 border-dashed border-white/10 rounded-2xl p-20 min-h-[400px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 mt-8 relative group"
                onClick={() => !isAnalyzing && document.getElementById('f').click()}
              >
                <input type="file" id="f" className="hidden" accept="image/*" onChange={handleFileUpload} />
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-10 text-purple-500 animate-spin" />
                    <p className="text-lg text-slate-300">{loadingMsg}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-slate-400 mb-4 group-hover:text-purple-400 transition-colors" />
                    <p className="text-lg text-slate-300">Haz clic o arrastra para analizar</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-8 justify-between">
              <div 
                className="inline-block px-6 py-5 rounded-xl border-2 font-bold text-xl uppercase tracking-wider text-center"
                style={{ borderColor: analysisColor || "#334155", color: analysisColor || "#94a3b8", backgroundColor: `${analysisColor}10` }}
              >
                {analysisResult || "Esperando Análisis"}
              </div>

              <div className="w-full h-[500px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
                <img src={analyzedImage || selected.image} className="w-full h-full object-cover" />
              </div>

              <div className="relative pt-4 pl-6 border-l-4 border-purple-500">
                <p className="text-lg text-slate-300 italic">"{selected.explanation}"</p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
