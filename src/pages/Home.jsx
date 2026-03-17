"use client";
import { useEffect, useRef } from "react";
import { VideoIcon } from "lucide-react";
import Marquee from "react-fast-marquee";
import { companiesLogo } from "../data/companiesLogo";
import { useThemeContext } from "../context/ThemeContext";
import { FaqSection } from "../sections/FaqSection";
import Pricing from "../sections/Pricing";
import { VideoScroll } from "../sections/VideoScroll";
import FeaturesShowcase from "../sections/FeaturesShowcase";
import NeuralNetwork from "../components/NeuralNetwork";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Page() {
    const { theme } = useThemeContext();
    const containerRef = useRef(null);
    const navigate = useNavigate();

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end Math.max(0, start)"],
    });

    // Slight parallax for the title
    const textY = useTransform(scrollYProgress, [0, 1], [0, 150]);

    useEffect(() => {
        console.log("Home Page Mounted");
    }, []);

    return (
        <div className="bg-[#02050E] text-white min-h-screen selection:bg-blue-500/30">
            {/* Hero Section */}
            <div id="hero" ref={containerRef} className="relative flex flex-col items-center justify-center text-center px-4 pt-48 pb-[20vh] overflow-hidden min-h-[85vh]">
                
                {/* Background Effects (Mockup Style) */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <NeuralNetwork />
                </div>

                {/* Text Content */}
                <div className="relative z-30 flex flex-col items-center text-center px-4 w-full pt-10">
                    <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full p-1 pr-4 mb-8 backdrop-blur-md">
                        <div className="bg-white text-black text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                            Live
                        </div>
                        <span className="text-[13px] text-slate-300 font-medium tracking-wide">
                            Real-time data
                        </span>
                    </div>

                    <h1 className="text-6xl md:text-7xl lg:text-[80px] font-medium tracking-tight text-white max-w-5xl mb-6 leading-[1.1]">
                        IA Visionaria para la <br className="hidden md:block" /> Precisión Clínica
                    </h1>
                    
                    <p className="text-slate-400 max-w-2xl mb-10 text-lg md:text-xl leading-relaxed">
                        Redefiniendo el diagnóstico a través de la Ingeniería Multimedia. <br className="hidden sm:block" /> Detecta patologías mediante redes neuronales en segundos.
                    </p>

                    <div className="flex items-center gap-4 relative z-[40]">
                        <button 
                            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95"
                        >
                            Análisis AI
                        </button>
                        <button 
                            onClick={() => document.getElementById('donations')?.scrollIntoView({ behavior: 'smooth' })}
                            className="bg-white/10 text-white border border-white/20 px-10 py-4 rounded-full font-bold text-lg hover:bg-white/20 transition backdrop-blur-md active:scale-95"
                        >
                            Donaciones
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Scroll Section - Overlapping the Hero */}
            <div className="-mt-[26vh] relative z-20">
                <VideoScroll />
            </div>

            {/* Tecnologias Utilizadas */}
            <div className="pt-0 pb-2 text-center relative z-20 -mt-[15vh]">
                <p className="text-slate-500 text-sm font-bold tracking-[0.2em] uppercase mb-4">
                    Tecnologías y Modelos de IA Utilizados
                </p>
            </div>

            {/* Brands Section */}
            <div className="py-6 border-y border-white/5 bg-[#02050E] w-full">
                <Marquee className="max-w-7xl mx-auto" gradient={true} speed={30} gradientColor={[2, 5, 14]}>
                    <div className="flex items-center justify-center">
                        {[...companiesLogo, ...companiesLogo].map((company, index) => (
                            <img key={index}
                                className="mx-14 transition-all duration-300 hover:filter-none"
                                src={company.logo}
                                alt={company.name}
                                style={{ 
                                    height: '50px', 
                                    width: 'auto',
                                    filter: 'brightness(0) invert(1)' 
                                }}
                            />
                        ))}
                    </div>
                </Marquee>
            </div>

            <div id="features">
                <FeaturesShowcase />
            </div>

            <div id="donations">
                <Pricing />
            </div>

            <div id="faq">
                <FaqSection />
            </div>

            {/* Call to Action */}
            <div className="flex flex-col items-center text-center justify-center py-32 bg-gradient-to-b from-transparent to-purple-600/5 mb-20 shadow-[0_50px_100px_-20px_rgba(147,51,234,0.1)]">
                <h3 className="text-5xl font-bold mb-6">¿Listo para profundizar?</h3>
                <p className="text-lg text-slate-400 max-w-2xl px-6 mb-12">
                    Nuestra documentación técnica detalla la arquitectura de las redes neuronales, el proceso de entrenamiento y la implementación del Non-Maximum Suppression (NMS) unificado.
                </p>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate("/documentation")}
                        className="bg-purple-600 text-white font-bold rounded-full px-12 h-14 text-lg hover:bg-purple-700 transition shadow-[0_0_30px_rgba(147,51,234,0.3)]"
                    >
                        Leer Documentación
                    </button>
                </div>
            </div>
        </div>
    );
}