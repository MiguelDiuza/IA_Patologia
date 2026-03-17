import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { showcaseData } from "../data/showcaseData";
import { Upload, CheckCircle2, Loader2, Info } from "lucide-react";
import * as ort from "onnxruntime-web";

// Mapeos de Clases (Iguales a los del Backend)
const CEREBRO_NAMES = { 0: 'Glioma', 1: 'Meningioma', 2: 'No Tumor', 3: 'Pituitaria' };
const CELULAS_NAMES = { 0: 'Celula Atipica', 1: 'Celula Atipica' };
const PULMONES_NAMES = {
  0: 'Agrandamiento Aortico', 1: 'Atelectasia', 2: 'Calcificacion',
  3: 'Cardiomegalia', 4: 'Consolidacion', 5: 'Enf. Intersticial', 6: 'Infiltracion',
  7: 'Opacidad Pulmonar', 8: 'Nodulo o Masa', 9: 'Otra Lesion',
  10: 'Derrame Pleural', 11: 'Engrosamiento Pleural', 12: 'Neumotorax',
  13: 'Sin Hallazgos'
};

export default function FeaturesShowcase() {
  const [selectedId, setSelectedId] = useState(showcaseData[0].id);
  const selected = showcaseData.find((s) => s.id === selectedId);

  // Estados para el Análisis Real en Navegador
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
    // Limpiar sesión al cambiar si es necesario
    sessionRef.current = null;
  }, [selectedId]);

  // Funciones de procesamiento de imagen
  const preprocess = async (canvas, targetW, targetH) => {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, targetW, targetH);
    const { data } = imageData;

    const input = new Float32Array(targetW * targetH * 3);
    for (let i = 0; i < data.length; i += 4) {
      // Normalizar 0-255 a 0-1 y separar canales R, G, B
      const pixelIdx = i / 4;
      input[pixelIdx] = data[i] / 255.0; // R
      input[pixelIdx + targetW * targetH] = data[i + 1] / 255.0; // G
      input[pixelIdx + 2 * targetW * targetH] = data[i + 2] / 255.0; // B
    }
    return new ort.Tensor("float32", input, [1, 3, targetH, targetW]);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setLoadingMsg("Iniciando motor de IA local...");

    try {
      const typeMap = { 1: "cerebro", 2: "celulas", 3: "pulmones" };
      const pathologyType = typeMap[selectedId];
      const modelPath = `/models/${pathologyType}/model.onnx`;

      // 1. Cargar Sesión ONNX si no existe
      if (!sessionRef.current) {
        setLoadingMsg("Cargando modelo en memoria (solo esta vez)...");
        sessionRef.current = await ort.InferenceSession.create(modelPath, {
          executionProviders: ['wasm'],
          graphOptimizationLevel: 'all'
        });
      }

      const session = sessionRef.current;
      setLoadingMsg("Procesando imagen médica...");

      // 2. Leer y Redimensionar Imagen
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await new Promise(resolve => (img.onload = resolve));

      const inputW = 640;
      const inputH = 640;
      const canvas = document.createElement("canvas");
      canvas.width = inputW;
      canvas.height = inputH;
      const ctx = canvas.getContext("2d");
      
      // Ajustar con aspecto (letterbox)
      const scale = Math.min(inputW / img.width, inputH / img.height);
      const nw = img.width * scale;
      const nh = img.height * scale;
      const dx = (inputW - nw) / 2;
      const dy = (inputH - nh) / 2;
      
      ctx.fillStyle = "#727272"; // Padding color
      ctx.fillRect(0, 0, inputW, inputH);
      ctx.drawImage(img, dx, dy, nw, nh);

      // 3. Inferencia
      setLoadingMsg("Ejecutando Red Neuronal...");
      const tensor = await preprocess(canvas, inputW, inputH);
      const feeds = { [session.inputNames[0]]: tensor };
      const results = await session.run(feeds);
      const output = results[session.outputNames[0]].data;

      // 4. Post-procesamiento (Simplificado para V8 ONNX)
      // Formato: [8400 x (4 box + n classes)]
      const numClasses = pathologyType === "cerebro" ? 4 : (pathologyType === "celulas" ? 2 : 14);
      const totalElements = 8400;
      const stride = 4 + numClasses;
      
      let maxConfFound = 0;
      let bestDet = null;
      const detections = [];
      const confThresh = pathologyType === "celulas" ? 0.15 : 0.25;

      for (let i = 0; i < totalElements; i++) {
        let maxScore = 0;
        let classId = -1;
        for (let c = 0; c < numClasses; c++) {
          const score = output[i + (4 + c) * totalElements];
          if (score > maxScore) {
            maxScore = score;
            classId = c;
          }
        }

        if (maxScore > maxConfFound) maxConfFound = maxScore;

        if (maxScore > confThresh) {
          const cx = output[i];
          const cy = output[i + 1 * totalElements];
          const w = output[i + 2 * totalElements];
          const h = output[i + 3 * totalElements];

          detections.push({
            box: [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2],
            score: maxScore,
            classId
          });
        }
      }

      console.log(`[*] Depuracion Local: Conf Máxima ${maxConfFound.toFixed(4)}`);

      // 5. Dibujar Resultados Finales
      const resultCanvas = document.createElement("canvas");
      resultCanvas.width = img.width;
      resultCanvas.height = img.height;
      const rCtx = resultCanvas.getContext("2d");
      rCtx.drawImage(img, 0, 0);

      let isPositive = false;
      let labels = [];
      const names = pathologyType === "cerebro" ? CEREBRO_NAMES : (pathologyType === "celulas" ? CELULAS_NAMES : PULMONES_NAMES);

      detections.sort((a, b) => b.score - a.score).slice(0, 10).forEach(det => {
        const label = names[det.classId] || `Hallazgo ${det.classId}`;
        
        // Filtro sano
        if (pathologyType === "cerebro" && label === "No Tumor") return;
        if (pathologyType === "pulmones" && (label === "Sin Hallazgos" || det.classId === 13)) return;

        isPositive = true;
        labels.push(label.toUpperCase());

        // Escalar coordenadas
        const x1 = (det.box[0] - dx) / scale;
        const y1 = (det.box[1] - dy) / scale;
        const x2 = (det.box[2] - dx) / scale;
        const y2 = (det.box[3] - dy) / scale;

        // Dibujar
        rCtx.lineWidth = 4;
        const color = pathologyType === "celulas" ? "#FF00FF" : (pathologyType === "pulmones" ? "#FFA500" : "#FF0000");
        rCtx.strokeStyle = color;
        rCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        
        rCtx.fillStyle = color;
        rCtx.font = "bold 20px Arial";
        const txt = `${label} ${(det.score * 100).toFixed(0)}%`;
        const tw = rCtx.measureText(txt).width;
        rCtx.fillRect(x1, y1 - 30, tw + 10, 30);
        rCtx.fillStyle = "white";
        rCtx.fillText(txt, x1 + 5, y1 - 8);
      });

      // 6. Actualizar UI
      if (isPositive) {
        setAnalysisResult(`POSITIVO - ${[...new Set(labels)].join(", ")}`);
        setAnalysisColor("#EF4444");
      } else {
        setAnalysisResult("NEGATIVO - PATRON NORMAL");
        setAnalysisColor("#10B981");
      }
      setAnalyzedImage(resultCanvas.toDataURL("image/jpeg", 0.9));

    } catch (error) {
      console.error("Error en analisis local:", error);
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
          Arrastra la imagen de tus exámenes. Nuestra IA se descargará y procesará de forma segura y <strong className="text-purple-400">privada directamente en tu navegador</strong>.
        </p>
        <div className="flex items-center gap-3 justify-center mb-6 bg-purple-500/10 border border-purple-500/20 p-3 rounded-lg max-w-md mx-auto">
          <Info className="size-5 text-purple-400" />
          <p className="text-xs text-purple-200 uppercase tracking-widest font-bold text-center">
             Procesamiento 100% Local y Privado
          </p>
        </div>
        <p className="text-sm text-center text-slate-500 bg-red-900/10 border border-red-500/20 p-4 rounded-xl leading-relaxed mx-auto max-w-full">
          * <strong className="text-red-400">Aviso médico importante:</strong> Los resultados se generan localmente mediante modelos matemáticos. <strong>No constituye un diagnóstico médico real</strong>. Siempre acuda a un profesional de la salud.
        </p>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-2xl text-purple-400 font-medium tracking-wide">
          Seleccione una categoría para iniciar el motor
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto mb-24">
        {showcaseData.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <motion.div
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              initial={false}
              animate={{
                scale: isSelected ? 1.05 : 0.95,
                filter: isSelected ? "grayscale(0%)" : "grayscale(100%) brightness(0.7) sepia(0.5) hue-rotate(250deg)",
              }}
              whileHover={{ scale: isSelected ? 1.05 : 0.98 }}
              className={`relative cursor-pointer rounded-2xl overflow-hidden aspect-[4/5] border transition-colors duration-500 ${
                isSelected ? "border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4)]" : "border-slate-800 border-2"
              }`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                <h3 className={`text-xl font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>
                  {item.title}
                </h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8 border-r border-white/5 pr-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                  {selected.title}
                </h2>
                <ul className="space-y-4">
                  {selected.info.map((info, idx) => (
                    <li key={idx} className="flex items-center gap-4 text-slate-300">
                      <CheckCircle2 className="size-5 text-purple-400 shrink-0" />
                      <span className="text-lg">{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div 
                className="bg-[#050510]/50 border-2 border-dashed border-white/10 rounded-2xl p-20 min-h-[400px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 transition-colors mt-8 relative group"
                onClick={() => !isAnalyzing && document.getElementById('fileInput').click()}
              >
                <input 
                  type="file" 
                  id="fileInput" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleFileUpload}
                />
                
                {isAnalyzing ? (
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-12 text-purple-500 animate-spin" />
                    <p className="text-xl text-white font-medium">{loadingMsg}</p>
                    <p className="text-sm text-slate-400 italic">No cierre esta ventana</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-10 text-slate-400 mb-4 group-hover:text-purple-400 transition-colors" />
                    <p className="text-xl text-slate-300 font-medium">Analizar Imagen Localmente</p>
                    <p className="text-slate-500 mt-2">Los datos no se enviarán a ningún servidor</p>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col space-y-8 justify-between">
              <div 
                className="px-6 py-5 rounded-xl border-2 font-bold text-2xl uppercase tracking-wider text-center"
                style={{ 
                  borderColor: analysisColor || "#334155",
                  color: analysisColor || "#94a3b8",
                  backgroundColor: `${analysisColor || "#334155"}15`
                }}
              >
                {analysisResult || "Esperando Imagen..."}
              </div>

              <div className="w-full h-[600px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative shadow-2xl">
                <img
                  src={analyzedImage || selected.image}
                  alt="Resultado"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="relative pt-4 pl-6 border-l-4" style={{ borderColor: analysisColor || "#9333ea" }}>
                <p className="text-lg text-slate-300 italic leading-relaxed">
                  "{selected.explanation}"
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
