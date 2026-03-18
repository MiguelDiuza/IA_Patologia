import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { navLinks } from "../data/navLinks";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
    const [openMobileMenu, setOpenMobileMenu] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (openMobileMenu) {
            document.body.classList.add("max-md:overflow-hidden");
        } else {
            document.body.classList.remove("max-md:overflow-hidden");
        }
    }, [openMobileMenu]);

    const handleNavClick = (e, href) => {
        if (href.startsWith("#")) {
            e.preventDefault();
            const elementId = href.substring(1);
            
            if (location.pathname !== "/") {
                // If not on home, go home then wait and scroll
                navigate("/", { state: { scrollTo: elementId } });
            } else {
                // Already on home, just scroll
                document.getElementById(elementId)?.scrollIntoView({ behavior: "smooth" });
            }
            setOpenMobileMenu(false);
        }
    };

    // Effect to handle scrolling when arriving at Home from another page
    useEffect(() => {
        if (location.pathname === "/" && location.state?.scrollTo) {
            const elementId = location.state.scrollTo;
            // Delay for rendering
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth" });
                    // Clear state
                    navigate(location.pathname, { replace: true, state: {} });
                }
            }, 100);
        }
    }, [location, navigate]);

    return (
        <nav className={`flex items-center justify-between fixed z-50 top-0 w-full px-6 md:px-16 lg:px-24 xl:px-32 py-4 ${openMobileMenu ? '' : 'backdrop-blur'}`}>
            <Link to="/" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                <img className="h-9 md:h-9.5 w-auto shrink-0" src="/assets/logo-light.svg" alt="Logo" width={140} height={40} priority fetchPriority="high" />
            </Link>
            <div className="hidden items-center md:gap-8 lg:gap-9 md:flex lg:pl-20">
                {navLinks.map((link) => (
                    <a 
                        key={link.name} 
                        href={link.href} 
                        onClick={(e) => handleNavClick(e, link.href)}
                        className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {link.name}
                    </a>
                ))}
            </div>
            {/* Mobile menu */}
            <div className={`fixed inset-0 flex flex-col items-center justify-center gap-6 text-lg font-medium bg-white/60 dark:bg-black/40 backdrop-blur-md md:hidden transition duration-300 ${openMobileMenu ? "translate-x-0" : "-translate-x-full"}`}>
                {navLinks.map((link) => (
                    <a key={link.name} href={link.href} onClick={(e) => handleNavClick(e, link.href)}>
                        {link.name}
                    </a>
                ))}
                <button className="aspect-square size-10 p-1 items-center justify-center bg-purple-600 hover:bg-purple-700 transition text-white rounded-md flex" onClick={() => setOpenMobileMenu(false)}>
                    <XIcon />
                </button>
            </div>
            <div className="flex items-center gap-4">
                <button 
                    className="hidden md:block hover:bg-slate-100 dark:hover:bg-purple-950 transition px-4 py-2 border border-purple-600 rounded-md"
                    onClick={() => window.open("https://colab.research.google.com/drive/1WpdcvYqSeUMKKwH8u7scraesVj6FGTHn", "_blank")}
                >
                    Colab
                </button>
                <button 
                    className="hidden md:block px-4 py-2 bg-purple-600 hover:bg-purple-700 transition text-white rounded-md"
                    onClick={() => navigate("/dataset")}
                >
                    Dataset
                </button>
                <button onClick={() => setOpenMobileMenu(!openMobileMenu)} className="md:hidden">
                    <MenuIcon size={26} className="active:scale-90 transition" />
                </button>
            </div>
        </nav>
    );
}