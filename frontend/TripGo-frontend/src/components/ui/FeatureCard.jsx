const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="flex flex-col items-center text-center p-10 rounded-3xl bg-charcoal border border-white/5 hover:border-primary/30 transition-all duration-300 group">
      <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-black transition-all">
        <span className="material-symbols-outlined !text-4xl">{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-lg">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;