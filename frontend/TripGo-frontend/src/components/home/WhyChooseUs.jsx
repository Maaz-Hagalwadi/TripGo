const FEATURES = [
  { title: "Secure Payment", desc: "Military-grade encryption" },
  { title: "24/7 Support", desc: "Always-on concierge help" },
  { title: "First-Class Comfort", desc: "Luxury fleet experience" },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24">
      <h2 className="text-4xl text-center font-extrabold mb-16">
        Why Choose TripGo
      </h2>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {FEATURES.map(f => (
          <div key={f.title} className="bg-charcoal p-10 rounded-3xl">
            <h3 className="text-xl font-bold">{f.title}</h3>
            <p className="text-slate-400 mt-4">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
