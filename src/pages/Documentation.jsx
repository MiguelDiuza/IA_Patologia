import React, { useEffect, useState } from 'react';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Documentation() {
    const [htmlContent, setHtmlContent] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            const path = (import.meta.env.BASE_URL + "private/document.txt").replace("//", "/");
            console.log("Fetching documentation from:", path);
            try {
                const response = await fetch(path);
                
                if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
                
                const text = await response.text();
                
                if (text.trim().startsWith("<!DOCTYPE")) {
                    console.error("Fetch returned index.html instead of doc.");
                    throw new Error("404: File not found (Vite redirected to index.html)");
                }
                
                setHtmlContent(text);
                setError(false);
            } catch (err) {
                console.error("Documentation load error:", err);
                
                // FALLBACK HTML content embedded directly in the component for reliability
                const fallbackHtml = `
                <div class="max-w-5xl mx-auto p-6 bg-slate-950 text-slate-200 font-sans leading-relaxed border border-white/5 rounded-2xl shadow-2xl">
                    <header class="mb-12 border-b border-slate-800 pb-8 text-center">
                        <h1 class="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent mb-4">
                            DOCUMENTACIÓN TÉCNICA (FALLBACK)
                        </h1>
                        <p class="text-slate-400">Verifica que "public/private/document.txt" esté disponible para carga dinámica.</p>
                    </header>
                    <div class="space-y-8 text-center py-20">
                        <p class="text-2xl font-bold">El documento se cargará desde el archivo de texto pronto.</p>
                        <p class="text-slate-500">Si ves este mensaje, significa que el fetch del archivo .txt falló, pero la página está activa.</p>
                    </div>
                </div>
                `;
                setHtmlContent(fallbackHtml);
                setError(false); // We don't want the error screen if we have fallback HTML
            } finally {
                setLoading(false);
            }
        };

        fetchContent();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#02050E] flex flex-col items-center justify-center text-white gap-4">
                <Loader2 className="animate-spin text-purple-500" size={40} />
                <p className="text-slate-400 font-medium animate-pulse">Cargando Documentación...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#02050E] flex flex-col items-center justify-center text-white px-6 text-center">
                <h1 className="text-3xl font-bold mb-4">Error al cargar el documento</h1>
                <p className="text-slate-400 mb-8 max-w-md">No pudimos encontrar el archivo de documentación. Por favor, asegúrate de que el archivo existe en el servidor.</p>
                <Link to="/" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full font-bold transition">
                    Volver al Inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-[#02050E] text-white min-h-screen pt-32 pb-20 selection:bg-purple-500/30">
            <div className="max-w-7xl mx-auto px-6">
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition group">
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        Volver al Inicio
                    </Link>
                </div>

                {/* Renderizado del contenido HTML del TXT */}
                {htmlContent ? (
                    <div 
                        className="documentation-content animate-in fade-in duration-700"
                        dangerouslySetInnerHTML={{ __html: htmlContent }} 
                    />
                ) : (
                    <div className="p-10 border border-white/10 rounded-3xl bg-slate-900 shadow-2xl">
                        <h1 className="text-4xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                            No se pudo cargar el documento
                        </h1>
                        <p className="text-slate-400 text-center mb-10 text-xl">
                            Asegúrate de que el archivo 'public/private/document.txt' existe en tu servidor local.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
