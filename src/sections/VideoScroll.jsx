"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function VideoScroll() {
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const width = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.6, 0.95, 1],
    ["75vw", "75vw", "100vw", "100vw", "40vw", "40vw"]
  );

  const top = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.6, 0.95, 1],
    ["10vh", "10vh", "0vh", "0vh", "10vh", "10vh"]
  );

  const borderRadius = useTransform(
    scrollYProgress,
    [0, 0.15, 0.35, 0.6, 0.95, 1],
    ["24px", "24px", "0px", "0px", "20px", "20px"]
  );

  return (
    <div ref={containerRef} className="relative h-[220vh] w-full">
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        <motion.div
          style={{
            width,
            top,
            borderRadius,
            x: "-50%", // Absolute horizontal center
          }}
          className="absolute left-1/2 z-20 overflow-hidden shadow-[0_0_80px_rgba(59,130,246,0.25)] border border-blue-500/10 aspect-video bg-black"
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source
              src="/assets/Visumed.mp4"
              type="video/mp4"
            />
          </video>

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
        </motion.div>
      </div>
    </div>
  );
}
