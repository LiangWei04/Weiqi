const friendlyMessages: Array<[RegExp, string]> = [
  [/duplicate key|unique constraint/i, 'This record already exists. Please check for duplicates.'],
  [/foreign key|violates.*constraint/i, 'This action cannot be completed because related records still depend on it.'],
  [/invalid input syntax|invalid.*date/i, 'One of the values entered is not valid. Please check the form and try again.'],
  [/registration.*closed/i, 'Registration is closed for this activity.'],
  [/capacity|full/i, 'This activity is already full.'],
  [/unauthori[sz]ed|forbidden|permission/i, 'You do not have permission to perform this action.'],
  [/token|session/i, 'Your session has expired. Please log in again.'],
  [/network|failed to fetch/i, 'Could not connect to the server. Please check that the backend is running.'],
];

const isTechnicalMessage = (message: string) => (
  /^(error:|select |insert |update |delete |syntax error|invalid reference|relation .* does not exist)/i.test(message.trim())
  || /SQLSTATE|FROM-clause|constraint|stack|undefined|null value|violates/i.test(message)
);

export const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && !('response' in error)) {
    const matched = friendlyMessages.find(([pattern]) => pattern.test(error.message));
    return matched?.[1] || fallback;
  }

  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    const rawMessage = response?.data?.message || response?.data?.error || '';
    if (!rawMessage) {
      return fallback;
    }

    const matched = friendlyMessages.find(([pattern]) => pattern.test(rawMessage));
    if (matched) {
      return matched[1];
    }

    return isTechnicalMessage(rawMessage) ? fallback : rawMessage;
  }

  return fallback;
};
