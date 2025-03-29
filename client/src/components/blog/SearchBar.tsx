import { useState } from "react";

interface SearchBarProps {
  onSearch: (term: string) => void;
}

const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);

    // Option: Real-time search as the user types
    // onSearch(e.target.value);
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch("");
  };

  return (
    <form onSubmit={handleSubmit} className="relative max-w-md">
      <div className="flex items-center border-2 rounded-full overflow-hidden bg-white border-gray-200 focus-within:border-tomato-500 transition">
        <input
          type="text"
          placeholder="Search articles..."
          className="w-full py-3 px-5 outline-none"
          value={searchTerm}
          onChange={handleChange}
        />
        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 px-2"
            aria-label="Clear search"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
        <button
          type="submit"
          className="bg-tomato-500 text-white px-5 py-3 h-full focus:outline-none hover:bg-tomato-600 transition"
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
    </form>
  );
};

export default SearchBar;
