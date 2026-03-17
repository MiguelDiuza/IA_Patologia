import React from 'react';
import { Lock, Crown, Users, ArrowRight } from 'lucide-react';
import Pricing from '../sections/Pricing';

export default function Dataset() {
    return (
        <div className="bg-[#02050E] text-white min-h-screen pt-32 pb-20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col items-center text-center space-y-8 mb-20">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur opacity-40 animate-pulse"></div>
                        <div className="relative bg-[#0A0F1E] p-6 rounded-full border border-white/10 shadow-2xl">
                            <Lock className="size-12 text-purple-500" />
                        </div>
                    </div>
                    
                    <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                        Acceso de <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Dataset Privado</span>
                    </h1>
                    
                    <p className="text-xl text-slate-400 max-w-2xl leading-relaxed">
                        Lo sentimos, el dataset completo de VisuMed AI es <span className="text-white font-semibold">privado</span>. 
                        Para garantizar la integridad ética y técnica de los datos clínicos, el acceso está restringido.
                    </p>

                    <div className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-3xl w-full backdrop-blur-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Crown size={120} />
                        </div>
                        
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 text-left">
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Users className="text-purple-500" />
                                    Únete a nuestra Comunidad
                                </h2>
                                <p className="text-slate-300 mb-6">
                                    Para acceder a esta información privilegiada, debes unirte a nuestra comunidad de patrocinadores y colaboradores. 
                                    Tu aporte nos ayuda a seguir desarrollando tecnologías de diagnóstico accesibles y precisas.
                                </p>
                                <button 
                                    onClick={() => document.getElementById('pricing-plans')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-full transition group"
                                >
                                    Ver Planes de Patrocinio
                                    <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="pricing-plans" className="scroll-mt-32">
                    <Pricing />
                </div>
            </div>
        </div>
    );
}
