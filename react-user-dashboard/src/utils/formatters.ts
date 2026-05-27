export const formatDate = (dateValue: string) => {
  if (!dateValue) {
    return 'Date pending';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateValue));
};

export const formatShortDate = (dateValue: string) => {
  if (!dateValue) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(dateValue));
};

export const formatMonth = (dateValue: string) => {
  if (!dateValue) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-SG', {
    month: 'short',
    year: '2-digit',
  }).format(new Date(dateValue));
};

export const formatDateTime = (dateValue: string) => {
  if (!dateValue) {
    return '-';
  }

  return new Intl.DateTimeFormat('en-SG', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
};
