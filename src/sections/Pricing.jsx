import { SparklesIcon, Heart } from "lucide-react";
import { useThemeContext } from "../context/ThemeContext";
import SectionTitle from "../components/SectionTitle";
import { pricingData } from "../data/pricingData";

export default function Pricing() {
    const { theme } = useThemeContext();
    return (
        <div className="relative">
            <img className="absolute -mt-20 md:-mt-100 md:left-20 pointer-events-none" src={theme === "dark" ? "/assets/color-splash.svg" : "/assets/color-splash-light.svg"} alt="color-splash" width={1000} height={1000} priority fetchPriority="high" />
            <SectionTitle text1="COOPERACIÓN" text2="Apoya el Proyecto" text3="Este es un proyecto de investigación y desarrollo sin fines de lucro. Tus donaciones ayudan a financiar el entrenamiento de modelos de IA más precisos." />

            <div className="flex flex-wrap items-center justify-center gap-6 mt-16">
                {pricingData.map((plan, index) => (
                    <div 
                        key={index} 
                        className={`p-6 rounded-2xl max-w-75 w-full shadow-[0px_4px_26px] shadow-black/6 ${plan.mostPopular ? "relative pt-12 bg-gradient-to-b from-indigo-600 to-violet-600" : "bg-white/50 dark:bg-gray-800/50 border border-slate-200 dark:border-slate-800"}`}
                    >
                        {plan.mostPopular && (
                            <div className="flex items-center text-xs gap-1 py-1.5 px-2 text-purple-600 absolute top-4 right-4 rounded bg-white font-medium">
                                <SparklesIcon size={14} />
                                <p>Recomendado</p>
                            </div>
                        )}
                        <p className={plan.mostPopular && "text-white"}>{plan.title}</p>
                        <h4 className={`text-3xl font-semibold mt-1 ${plan.mostPopular && "text-white"}`}>${plan.price}<span className={`font-normal text-sm ${plan.mostPopular ? "text-white" : "text-slate-300"}`}>/donación</span></h4>
                        <hr className={`my-8 ${plan.mostPopular ? "border-gray-300" : "border-slate-300 dark:border-slate-700"}`} />
                        <div className={`space-y-4 ${plan.mostPopular ? "text-white" : "text-slate-600 dark:text-slate-300"}`}>
                            {plan.features.map((feature, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <Heart size={18} className={`${plan.mostPopular ? "text-white" : "text-purple-600"}`} />
                                    <span className="text-sm">{feature.name}</span>
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => window.open(plan.href, "_blank")}
                            className={`transition w-full py-3 rounded-lg font-medium mt-8 border-2 ${plan.mostPopular ? "bg-white hover:bg-slate-100 text-slate-800 border-transparent shadow-lg text-black" : "bg-transparent border-purple-600 hover:bg-purple-600 text-white"}`}
                        >
                            <span>{plan.buttonText}</span>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}