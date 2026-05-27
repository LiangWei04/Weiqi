import { paginationPages } from '../../utils/pagination';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PaginationControls = ({ page, totalPages, onPageChange }: PaginationControlsProps) => {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = paginationPages(page, totalPages);

  return (
    <nav className="pagination-row" aria-label="Section pages">
      <button type="button" className="secondary-action compact" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</button>
      {visiblePages.map((item, index) => (
        item === 'gap' ? (
          <span key={`gap-${index}`} className="pagination-gap">...</span>
        ) : (
          <button
            key={item}
            type="button"
            className={item === page ? 'secondary-action compact page-button active' : 'secondary-action compact page-button'}
            onClick={() => onPageChange(item)}
          >
            {item}
          </button>
        )
      ))}
      <button type="button" className="secondary-action compact" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</button>
    </nav>
  );
};

export default PaginationControls;
