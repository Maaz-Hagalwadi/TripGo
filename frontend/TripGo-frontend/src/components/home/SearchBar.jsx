export default function SearchBar() {
  return (
    <div className="bg-charcoal border border-white/10 p-6 rounded-2xl grid md:grid-cols-4 gap-4">
      <input className="bg-input-gray p-4 rounded-xl" placeholder="From" />
      <input className="bg-input-gray p-4 rounded-xl" placeholder="To" />
      <input className="bg-input-gray p-4 rounded-xl" placeholder="Date" />
      <button className="bg-primary text-black rounded-xl font-bold">
        Search
      </button>
    </div>
  );
}
