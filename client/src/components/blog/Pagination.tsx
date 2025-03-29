interface PaginationProps {
  postsPerPage: number;
  totalPosts: number;
  paginate: (pageNumber: number) => void;
  currentPage: number;
}

const Pagination = ({ postsPerPage, totalPosts, paginate, currentPage }: PaginationProps) => {
  const pageNumbers = [];

  // Calculate total pages
  for (let i = 1; i <= Math.ceil(totalPosts / postsPerPage); i++) {
    pageNumbers.push(i);
  }

  // If there's only one page, don't show pagination
  if (pageNumbers.length <= 1) return null;

  // For large number of pages, show limited page numbers with ellipsis
  let pagesToRender: (number | string)[] = pageNumbers;
  
  if (pageNumbers.length > 5) {
    if (currentPage <= 3) {
      // Show first 3 pages, ellipsis, and last page
      pagesToRender = [...pageNumbers.slice(0, 3), '...', pageNumbers[pageNumbers.length - 1]];
    } else if (currentPage >= pageNumbers.length - 2) {
      // Show first page, ellipsis, and last 3 pages
      pagesToRender = [pageNumbers[0], '...', ...pageNumbers.slice(-3)];
    } else {
      // Show first page, ellipsis, current page and neighbors, ellipsis, and last page
      pagesToRender = [
        pageNumbers[0],
        '...',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        '...',
        pageNumbers[pageNumbers.length - 1]
      ];
    }
  }

  return (
    <nav className="flex justify-center" aria-label="Pagination">
      <ul className="flex space-x-2">
        {/* Previous button */}
        <li>
          <button
            onClick={() => currentPage > 1 && paginate(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 rounded-md ${
              currentPage === 1
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </li>
        
        {/* Page numbers */}
        {pagesToRender.map((page, index) => {
          if (page === '...') {
            return (
              <li key={`ellipsis-${index}`}>
                <span className="px-3 py-2 rounded-md text-gray-500">...</span>
              </li>
            );
          }
          
          const pageNum = page as number;
          
          return (
            <li key={pageNum}>
              <button
                onClick={() => paginate(pageNum)}
                className={`px-3 py-2 rounded-md ${
                  currentPage === pageNum
                    ? 'bg-tomato-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            </li>
          );
        })}
        
        {/* Next button */}
        <li>
          <button
            onClick={() => currentPage < pageNumbers.length && paginate(currentPage + 1)}
            disabled={currentPage === pageNumbers.length}
            className={`px-3 py-2 rounded-md ${
              currentPage === pageNumbers.length
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            aria-label="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Pagination;
