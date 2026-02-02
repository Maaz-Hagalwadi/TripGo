import SearchBar from "./SearchBar";

export default function HeroSection() {
  return (
    <section className="relative h-[700px] flex items-center justify-center">
      <div className="absolute inset-0 bg-cover bg-center bg-[url('/hero.jpg')]"></div>

      <div className="relative z-10 text-center max-w-5xl">
        <h1 className="text-6xl font-extrabold text-white">
          Your Journey, <span className="text-primary">Simplified.</span>
        </h1>

        <p className="text-slate-300 text-xl mt-6 mb-12">
          Book premium bus tickets across 500+ cities.
        </p>

        <SearchBar />
      </div>
    </section>
  );
}
