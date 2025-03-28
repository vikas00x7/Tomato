import { useState } from "react";
import { Link, useLocation } from "wouter";
import MobileMenu from "./MobileMenu";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="text-tomato-500 text-2xl font-serif font-bold">Tomato</span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className={`font-medium ${isActive('/') ? 'text-tomato-500' : 'text-gray-700 hover:text-tomato-500'} transition-colors`}>Home</Link>
            <Link href="/menu" className={`font-medium ${isActive('/menu') ? 'text-tomato-500' : 'text-gray-700 hover:text-tomato-500'} transition-colors`}>Menu</Link>
            <Link href="/about" className={`font-medium ${isActive('/about') ? 'text-tomato-500' : 'text-gray-700 hover:text-tomato-500'} transition-colors`}>About</Link>
            <Link href="/blog" className={`font-medium ${isActive('/blog') ? 'text-tomato-500' : 'text-gray-700 hover:text-tomato-500'} transition-colors`}>Blog</Link>
            <Link href="/contact" className={`font-medium ${isActive('/contact') ? 'text-tomato-500' : 'text-gray-700 hover:text-tomato-500'} transition-colors`}>Contact</Link>
            <a 
              href="#" 
              className="bg-tomato-500 text-white px-6 py-2 rounded-full font-medium hover:bg-tomato-600 transition-colors"
            >
              Order Now
            </a>
          </div>
          
          {/* Mobile menu button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden text-gray-700 hover:text-tomato-500 focus:outline-none"
            aria-label={isOpen ? "Close menu" : "Open menu"}
          >
            {isOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <MobileMenu isOpen={isOpen} closeMenu={() => setIsOpen(false)} />
      </nav>
    </header>
  );
};

export default Header;
