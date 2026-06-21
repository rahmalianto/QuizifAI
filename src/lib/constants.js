export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: {
    value: 'MULTIPLE_CHOICE',
    label: 'Multiple Choice',
    description: 'Single correct answer from options',
    icon: 'CircleDot',
  },
  CHECKBOX: {
    value: 'CHECKBOX',
    label: 'Checkbox',
    description: 'Multiple correct answers from options',
    icon: 'CheckSquare',
  },
  SHORT_ANSWER: {
    value: 'SHORT_ANSWER',
    label: 'Short Answer',
    description: 'Brief text response',
    icon: 'Type',
  },
  LONG_ANSWER: {
    value: 'LONG_ANSWER',
    label: 'Long Answer',
    description: 'Detailed text response',
    icon: 'AlignLeft',
  },
};

export const QUESTION_TYPE_LIST = Object.values(QUESTION_TYPES);

export const DEFAULT_QUESTION_COUNT = 10;
export const MIN_QUESTION_COUNT = 5;
export const MAX_QUESTION_COUNT = 30;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export const ACCEPTED_FILE_TYPES = {
  'text/markdown': ['.md'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

export const ACCEPTED_EXTENSIONS = ['.md', '.pdf', '.docx'];

export const ANSWER_TYPE_COLORS = {
  MULTIPLE_CHOICE: 'primary',
  CHECKBOX: 'info',
  SHORT_ANSWER: 'success',
  LONG_ANSWER: 'warning',
};
