import { motion } from "framer-motion";

export default function LandingExperience({ onEnter }) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col items-center justify-center bg-[#02040a]">
      {/* Cinematic Fluid Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 30%, rgba(0, 245, 255, 0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 70%, rgba(0, 245, 255, 0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 30%, rgba(139, 92, 246, 0.05) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 30%, rgba(0, 245, 255, 0.05) 0%, transparent 50%)",
            ],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 backdrop-blur-[100px]" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="relative z-10 text-center px-6"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 2 }}
          className="mb-8 flex justify-center"
        >
          <div className="h-[1px] w-12 bg-white/20 self-center" />
          <span className="mx-4 text-[10px] tracking-[0.4em] text-white/40 uppercase font-medium">
            The Living System
          </span>
          <div className="h-[1px] w-12 bg-white/20 self-center" />
        </motion.div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-light tracking-tight text-white mb-12">
          Your Health. <br />
          <span className="text-white/50 italic">Understood Over Time.</span>
        </h1>

        <motion.button
          whileHover={{ scale: 1.05, letterSpacing: "0.25em" }}
          whileTap={{ scale: 0.95 }}
          onClick={onEnter}
          className="glass-thin px-12 py-4 text-xs tracking-[0.2em] uppercase text-white/80 hover:text-white transition-all duration-500 ease-out flex items-center gap-4 group"
        >
          <span>Enter System</span>
          <motion.div
            animate={{ x: [0, 5, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f5ff]"
          />
        </motion.button>
      </motion.div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 1.5, duration: 2 }}
        className="absolute bottom-12 text-[9px] tracking-[0.2em] uppercase text-white/40"
      >
        Neural Analysis Engine v4.0.21
      </motion.div>
    </div>
  );
}
