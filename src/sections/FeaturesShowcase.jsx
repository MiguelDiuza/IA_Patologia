import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { showcaseData } from "../data/showcaseData";
import { Upload, ChevronRight, CheckCircle2 } from "lucide-react";

export default function FeaturesShowcase() {
  const [selectedId, setSelectedId] = useState(showcaseData[0].id);
  const selected = showcaseData.find((s) => s.id === selectedId);

  // Estados para el Análisis Real
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedImage, setAnalyzedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisColor, setAnalysisColor] = useState(null);

  // Resetear estados al cambiar de categoría
  useEffect(() => {
    setAnalyzedImage(null);
    setAnalysisResult(null);
    setAnalysisColor(null);
  }, [selectedId]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);

    // Mapeo de ID a tipo de patología para el backend
    const typeMap = { 1: "cerebro", 2: "celulas", 3: "pulmones" };
    const pathologyType = typeMap[selectedId];

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", pathologyType);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      setAnalysisResult(data.diagnostico);
      
      // Actualizamos colores según la instrucción: Rojo = Anomalía, Verde = Sano
      if (data.color === "green") setAnalysisColor("#10B981");
      else if (data.color === "red") setAnalysisColor("#EF4444");
      else if (data.color === "gray") setAnalysisColor("#94a3b8");

      if (data.image_base64) {
        setAnalyzedImage(data.image_base64);
      } else {
        setAnalyzedImage(null);
      }
    } catch (error) {
      console.error("Error analizando imagen:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="py-24 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto overflow-hidden">
      {/* Section Header & Disclaimer */}
      <div className="mb-12 max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">Análisis de Patologías con AI</h2>
        <p className="text-lg text-slate-300 mb-6 leading-relaxed">
          Arrastra la imagen de tus exámenes y nuestra Inteligencia Artificial la procesará en segundos para proporcionarte un diagnóstico estructurado y preliminar.
        </p>
        <p className="text-sm text-center text-slate-500 bg-red-900/10 border border-red-500/20 p-4 rounded-xl leading-relaxed mx-auto max-w-full">
          * <strong className="text-red-400">Aviso médico importante:</strong> El diagnóstico proporcionado está basado en modelos matemáticos e inteligencia artificial previamente entrenada y <strong>no constituye un diagnóstico médico real</strong>. Siempre debes acudir a un profesional de la salud certificado para obtener exámenes y un diagnóstico oficial. Este sistema es exclusivamente una herramienta tecnológica de apoyo y no nos hacemos responsables de las decisiones clínicas o personales tomadas con base en estos resultados.
        </p>
      </div>

      <div className="text-center mb-8">
        <h3 className="text-2xl text-purple-400 font-medium tracking-wide">
          Escoge una tarjeta según la patología que desees analizar
        </h3>
      </div>

      {/* Cards Section */}
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
            {/* Animated Border Glow for Selected Card */}
            {isSelected && (
              <div className="absolute inset-0 z-10 pointer-events-none moving-border">
                <div className="moving-border-content" style={{ borderRadius: "14px" }} />
              </div>
            )}

              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                <h3 className={`text-xl font-bold ${isSelected ? "text-white" : "text-slate-400"}`}>
                  {item.title}
                </h3>
                <p className={`text-sm mt-2 line-clamp-2 ${isSelected ? "text-slate-200" : "text-slate-500"}`}>
                  {item.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Panel Section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedId}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 md:p-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left side: Info and Upload */}
            <div className="space-y-8 border-r border-white/5 pr-8">
              <div>
                <h2 className="text-3xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-500">
                  {selected.title} Details
                </h2>
                <ul className="space-y-4">
                  {selected.info.map((info, idx) => (
                    <li key={idx} className="flex items-center gap-4 text-slate-300">
                      <div className="rounded-full border border-purple-500/50 p-1 flex items-center justify-center">
                         <CheckCircle2 className="size-4 text-purple-400 shrink-0" />
                      </div>
                      <span className="text-lg">{info}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div 
                className="bg-[#050510]/50 border-2 border-dashed border-white/10 rounded-2xl p-20 min-h-[400px] flex flex-col items-center justify-center text-center cursor-pointer hover:border-purple-500/50 transition-colors mt-8 relative group"
                onClick={() => document.getElementById('fileInput').click()}
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
                    <div className="size-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-lg text-slate-300">Analizando con Red Neuronal...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-8 text-slate-400 mb-4 group-hover:text-purple-400 transition-colors" />
                    <p className="text-lg text-slate-300">Haz clic o arrastra para analizar</p>
                  </>
                )}
              </div>
              
              <p className="text-slate-500 text-lg px-2">
                Clasificación automatizada de imágenes médicas con parámetros de personalización dinámicos.
              </p>
            </div>

            {/* Right side: Diagnosis, Image preview and Explanation */}
            <div className="flex flex-col space-y-8 justify-between">
              
              <div 
                className="inline-block px-6 py-5 rounded-xl border-2 font-bold text-xl uppercase tracking-wider box-border transition-colors duration-500"
                style={{ 
                  borderColor: analysisColor || selected.diagnosisColor,
                  color: analysisColor || selected.diagnosisColor,
                  backgroundColor: `${analysisColor || selected.diagnosisColor}10`
                }}
              >
                {analysisResult || selected.diagnosis}
              </div>

              <div className="w-full h-[600px] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden relative group shadow-2xl flex-grow">
                <img
                  src={analyzedImage || selected.image}
                  alt="Output Preview"
                  className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 flex items-end justify-center pointer-events-none p-8">
                  <div className="bg-black/80 backdrop-blur-sm border border-white/10 px-6 py-3 rounded-lg shadow-2xl">
                    <p className="text-sm font-bold uppercase tracking-widest text-white">
                      {analyzedImage ? "Resultado del Análisis de IA" : "Ejemplo de Visualización"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative pt-4">
                <div 
                  className="absolute left-0 top-4 bottom-0 w-1 rounded-full"
                  style={{ backgroundColor: selected.color || '#9333ea' }}
                />
                <p className="text-lg text-slate-300 italic pl-6 leading-relaxed">
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
