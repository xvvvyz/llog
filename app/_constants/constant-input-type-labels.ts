import InputType from '@/_constants/enum-input-type';

const INPUT_TYPE_LABELS = {
  [InputType.Checkbox]: 'Yes / no',
  [InputType.Duration]: 'Duration',
  [InputType.MultiSelect]: 'Select multiple',
  [InputType.Number]: 'Number',
  [InputType.Select]: 'Select',
  [InputType.Stopwatch]: 'Stopwatch',
};

export default INPUT_TYPE_LABELS;
