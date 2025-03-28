import { Link, useLocation } from "wouter";

interface MobileMenuProps {
  isOpen: boolean;
  closeMenu: () => void;
}

const MobileMenu = ({ isOpen, closeMenu }: MobileMenuProps) => {
  const [location] = useLocation();

  const isActive = (path: string) => {
    return location === path;
  };

  return (
    <div
      className={`transition-all duration-300 transform ${
        isOpen
          ? "opacity-100 visible translate-y-0"
          : "opacity-0 invisible -translate-y-full"
      } absolute top-16 left-0 right-0 bg-white shadow-lg rounded-b-lg py-4 md:hidden z-50`}
    >
      <div className="flex flex-col px-4 space-y-3">
        <Link
          href="/"
          onClick={closeMenu}
          className={`font-medium ${
            isActive("/") ? "text-tomato-500" : "text-gray-700 hover:text-tomato-500"
          } py-2 transition-colors`}
        >
          Home
        </Link>
        <Link
          href="/menu"
          onClick={closeMenu}
          className={`font-medium ${
            isActive("/menu") ? "text-tomato-500" : "text-gray-700 hover:text-tomato-500"
          } py-2 transition-colors`}
        >
          Menu
        </Link>
        <Link
          href="/about"
          onClick={closeMenu}
          className={`font-medium ${
            isActive("/about") ? "text-tomato-500" : "text-gray-700 hover:text-tomato-500"
          } py-2 transition-colors`}
        >
          About
        </Link>
        <Link
          href="/blog"
          onClick={closeMenu}
          className={`font-medium ${
            isActive("/blog") ? "text-tomato-500" : "text-gray-700 hover:text-tomato-500"
          } py-2 transition-colors`}
        >
          Blog
        </Link>
        <Link
          href="/contact"
          onClick={closeMenu}
          className={`font-medium ${
            isActive("/contact") ? "text-tomato-500" : "text-gray-700 hover:text-tomato-500"
          } py-2 transition-colors`}
        >
          Contact
        </Link>
        <a
          href="#"
          className="bg-tomato-500 text-white px-6 py-2 rounded-full font-medium hover:bg-tomato-600 transition-colors text-center"
        >
          Order Now
        </a>
      </div>
    </div>
  );
};

export default MobileMenu;
