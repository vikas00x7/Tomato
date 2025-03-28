import { Link } from "wouter";

const HeroSection = () => {
  return (
    <section className="relative h-screen flex items-center">
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      <img
        src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1740&q=80"
        alt="Fresh vegetable dish"
        className="absolute inset-0 w-full h-full object-cover"
        loading="eager"
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white leading-tight mb-6">
            Where Fresh<br />Meets Flavorful
          </h1>
          <p className="text-xl text-white mb-8 max-w-lg">
            Discover the taste of locally-sourced ingredients expertly crafted into dishes that nourish both body and soul.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/menu" className="bg-tomato-500 text-white px-8 py-3 rounded-full font-medium hover:bg-tomato-600 transition-colors">
              Explore Our Menu
            </Link>
            <Link href="/contact" className="bg-white text-tomato-500 px-8 py-3 rounded-full font-medium hover:bg-gray-100 transition-colors">
              Find a Location
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
