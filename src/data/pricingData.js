import { Heart } from "lucide-react";

export const pricingData = [
    {
        title: "Contribución Básica",
        price: 5,
        features: [
            {
                name: "Apoyo al servidor",
                icon: Heart,
            },
            {
                name: "Acceso a la comunidad",
                icon: Heart,
            },
        ],
        buttonText: "Donar $5",
        href: "https://paypal.me/migueldiuza/5", 
    },
    {
        title: "Socio de Investigación",
        price: 25,
        mostPopular: true,
        features: [
            {
                name: "Créditos en el proyecto",
                icon: Heart,
            },
            {
                name: "Acceso a datasets",
                icon: Heart,
            },
            {
                name: "Reporte de entrenamiento",
                icon: Heart,
            },
        ],
        buttonText: "Donar $25",
        href: "https://paypal.me/migueldiuza/25", 
    },
    {
        title: "Patrocinador IA",
        price: 100,
        features: [
            {
                name: "Logo en la web",
                icon: Heart,
            },
            {
                name: "Prioridad de modelos",
                icon: Heart,
            },
            {
                name: "Consultoría técnica",
                icon: Heart,
            },
        ],
        buttonText: "Donar $100",
        href: "https://paypal.me/migueldiuza/100", 
    }
];