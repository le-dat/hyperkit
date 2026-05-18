export default function Loading() {
  return (
    <div className="fixed inset-0 bg-hyper-950 flex items-center justify-center overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-hyper-accent/5 via-transparent to-transparent" />

      {/* Main loading content */}
      <div className="relative z-10 flex flex-col items-center gap-8 md:gap-12">
        {/* Hyperkit logo/text with animated glow */}
        <div className="relative">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white">
            HYPER<span className="text-hyper-accent">KIT</span>
          </h1>
          <div className="absolute -inset-2 md:-inset-4 bg-hyper-accent/20 blur-2xl md:blur-3xl animate-pulse" />
        </div>

        {/* Geometric loader - three rotating squares */}
        <div className="relative w-16 h-16 md:w-24 md:h-24">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 md:w-16 md:h-16 border-2 border-hyper-accent/30 border-t-hyper-accent rounded-sm animate-[spin_1.5s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 md:w-12 md:h-12 border-2 border-hyper-accent/20 border-b-hyper-accent rounded-sm animate-[spin_2s_cubic-bezier(0.68,-0.55,0.265,1.55)_infinite_reverse]" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 md:w-8 md:h-8 bg-hyper-accent/10 rounded-sm animate-pulse" />
          </div>
        </div>

        {/* Loading text with stagger animation */}
        <div className="flex gap-0.5 md:gap-1 font-mono text-xs md:text-sm text-hyper-400 tracking-wider">
          <span className="animate-bounce delay-0">I</span>
          <span className="animate-bounce delay-100">N</span>
          <span className="animate-bounce delay-200">I</span>
          <span className="animate-bounce delay-300">T</span>
          <span className="animate-bounce delay-400">I</span>
          <span className="animate-bounce delay-500">A</span>
          <span className="animate-bounce delay-600">L</span>
          <span className="animate-bounce delay-700">I</span>
          <span className="animate-bounce delay-800">Z</span>
          <span className="animate-bounce delay-900">I</span>
          <span className="animate-bounce delay-1000">N</span>
          <span className="animate-bounce delay-1100">G</span>
        </div>
      </div>
    </div>
  );
}
