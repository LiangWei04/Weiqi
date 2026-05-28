import { startOfDay } from '../shared/DatePickerField';
import { getApiErrorMessage } from '../../utils/apiErrors';

export const compareActivityDates = (leftDate?: string | null, rightDate?: string | null) => {
  const today = startOfDay(new Date()).getTime();
  const getSortValue = (dateValue?: string | null) => {
    if (!dateValue) {
      return { bucket: 3, distance: Number.MAX_SAFE_INTEGER };
    }

    const activityTime = startOfDay(new Date(dateValue)).getTime();
    if (activityTime === today) {
      return { bucket: 0, distance: 0 };
    }

    if (activityTime > today) {
      return { bucket: 1, distance: activityTime - today };
    }

    return { bucket: 2, distance: today - activityTime };
  };

  const left = getSortValue(leftDate);
  const right = getSortValue(rightDate);
  return left.bucket - right.bucket || left.distance - right.distance;
};

export const getAttendanceMarkingState = (dateValue: string | null | undefined, role: string) => {
  if (!dateValue) {
    return {
      canMark: false,
      canRequest: false,
      label: 'Date pending',
      help: 'Attendance cannot be marked until the activity date is confirmed.',
    };
  }

  const today = startOfDay(new Date()).getTime();
  const activityDate = startOfDay(new Date(dateValue)).getTime();

  if (activityDate > today) {
    return {
      canMark: false,
      canRequest: false,
      label: 'Not Open Yet',
      help: 'Attendance opens only on the activity date.',
    };
  }

  if (activityDate < today && role !== 'Captain') {
    return {
      canMark: false,
      canRequest: true,
      label: 'Request Captain Approval',
      help: 'This activity has passed. Submit a reason for captain approval before changing attendance.',
    };
  }

  if (activityDate < today && role === 'Captain') {
    return {
      canMark: true,
      canRequest: false,
      label: 'Captain Override',
      help: 'Only captains can directly update attendance after the activity date.',
    };
  }

  return {
    canMark: true,
    canRequest: false,
    label: 'Open Today',
    help: 'Attendance can be marked today.',
  };
};

export const formatRank = (rankType?: string | null, rankValue?: number | null) => {
  if (!rankType || rankValue === null || rankValue === undefined) {
    return '-';
  }

  return `${rankValue} ${rankType}`;
};

export const getErrorMessage = getApiErrorMessage;
