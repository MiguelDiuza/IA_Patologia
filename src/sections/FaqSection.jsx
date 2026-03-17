import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useThemeContext } from "../context/ThemeContext";
import SectionTitle from "../components/SectionTitle";
import { faqsData } from "../data/faqsData";

export const FaqSection = () => {
    const { theme } = useThemeContext();
    const [openIndex, setOpenIndex] = useState(null);
    return (
        <div className="relative max-w-2xl mx-auto flex flex-col items-center justify-center px-4 md:px-0">
            <img className="absolute -mb-120 -left-40 -z-10 pointer-events-none" src={theme === "dark" ? "/assets/color-splash.svg" : "/assets/color-splash-light.svg"} alt="color-splash" width={1000} height={1000} priority fetchPriority="high" />
            <SectionTitle text1="PREGUNTAS" text2="Preguntas Frecuentes" text3="Consulta las dudas más comunes sobre el funcionamiento, precisión y tecnología detrás de nuestras redes neuronales médicas." />
            <div className="mt-8 w-full">
                {faqsData.map((faq, index) => (
                    <div 
                        key={index}
                        className="border-b border-slate-300 dark:border-purple-900/50 py-6 cursor-pointer w-full group" 
                        onClick={() => setOpenIndex(openIndex === index ? null : index)}
                    >
                        <div className="flex justify-between items-center gap-4">
                            <h4 className="text-lg md:text-xl font-medium text-slate-200 group-hover:text-purple-400 transition-colors">
                                {faq.question}
                            </h4>
                            <div className={`transition-transform duration-300 text-purple-500 ${openIndex === index ? "rotate-180" : "rotate-0"}`}>
                                <ChevronDown size={24} />
                            </div>
                        </div>
                        <p className={`text-slate-400 transition-all duration-300 overflow-hidden ${openIndex === index ? "max-h-[500px] opacity-100 mt-4 pt-4 border-t border-white/5" : "max-h-0 opacity-0"}`}>
                             {faq.answer}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};