export const paginate = <T,>(items: T[], page: number, pageSize: number) => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    totalPages,
  };
};

export const paginationPages = (page: number, totalPages: number): Array<number | 'gap'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, page, page - 1, page + 1].filter((item) => item >= 1 && item <= totalPages));
  const sortedPages = Array.from(pages).sort((a, b) => a - b);
  const output: Array<number | 'gap'> = [];

  sortedPages.forEach((item, index) => {
    if (index > 0 && item - sortedPages[index - 1] > 1) {
      output.push('gap');
    }
    output.push(item);
  });

  return output;
};
