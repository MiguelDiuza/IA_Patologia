import { Route, Routes } from "react-router-dom"
import Home from "./pages/Home"
import Dataset from "./pages/Dataset"
import Documentation from "./pages/Documentation"
import Navbar from "./components/Navbar"
import Footer from "./components/Footer"
import LenisScroll from "./components/Lenis"
import ScrollToTop from "./components/ScrollToTop"

export default function App() {
    return (
        <>
            <ScrollToTop />
            <Navbar />
            <LenisScroll />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dataset" element={<Dataset />} />
                <Route path="/documentation" element={<Documentation />} />
            </Routes>
            <Footer />
        </>
    )
}