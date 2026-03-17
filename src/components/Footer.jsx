import { Link, useNavigate, useLocation } from "react-router-dom";
import { useThemeContext } from "../context/ThemeContext";
import { navLinks } from "../data/navLinks";

export default function Footer() {
    const { theme } = useThemeContext();
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavClick = (e, href) => {
        if (href.startsWith("#")) {
            e.preventDefault();
            const elementId = href.substring(1);
            
            if (location.pathname !== "/") {
                navigate("/", { state: { scrollTo: elementId } });
            } else {
                document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
            }
        }
    };

    return (
        <footer className="relative px-6 md:px-16 lg:px-24 xl:px-32 mt-40 w-full dark:text-slate-50">
            <img className="absolute max-w-4xl w-full h-auto -mt-30 max-md:px-4 right-0 md:right-16 lg:right-24 xl:right-32 top-0 pointer-events-none" src={theme === "dark" ? "/assets/landing-text-dark.svg" : "/assets/landing-text-light.svg"} alt="landing" width={930} height={340} priority="high" />
            <div className="flex flex-col md:flex-row justify-between w-full gap-10 border-b border-gray-200 dark:border-slate-700 pb-6">
                <div className="md:max-w-114">
                    <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                        <img className="h-9 md:h-9.5 w-auto shrink-0" src={theme === "dark" ? "/assets/logo-light.svg" : "/assets/logo-dark.svg"} alt="Logo" width={140} height={40} priority="high" />
                    </Link>
                    <p className="mt-6">
                        Plataforma de Diagnóstico Asistido mediante Inteligencia Artificial. Proyecto desarrollado por ingenieros multimedia enfocado en la detección temprana de patologías críticas con redes neuronales de vanguardia.
                    </p>
                </div>
                <div className="flex-1 flex items-start md:justify-end gap-20">
                    <div>
                        <h2 className="font-semibold mb-5">Company</h2>
                        <ul className="space-y-2">
                            {navLinks.map((link, index) => (
                                <li key={index}>
                                    <a 
                                        href={link.href} 
                                        onClick={(e) => handleNavClick(e, link.href)}
                                        className="hover:text-purple-600 transition"
                                    >
                                        {link.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-semibold mb-5">Get in touch</h2>
                        <div className="space-y-2 text-slate-400">
                            <p>+1-212-456-7890</p>
                            <p>contact@visumed.ai</p>
                        </div>
                    </div>
                </div>
            </div>
            <p className="pt-4 text-center pb-5 text-sm text-slate-500">
                Copyright {new Date().getFullYear()} © <span className="text-purple-600 font-bold">VISUMED AI</span>. All Right Reserved.
            </p>
        </footer>
    );
};