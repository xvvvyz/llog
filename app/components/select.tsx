import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/24/solid';

import ReactSelect, {
  components,
  ControlProps,
  InputProps,
  MenuProps,
  MultiValueGenericProps,
  MultiValueRemoveProps,
  NoticeProps,
  OptionProps,
  PlaceholderProps,
  Props as ReactSelectProps,
  SingleValueProps,
} from 'react-select';

import { forwardRef, Ref } from 'react';
import ReactSelectDeclaration from 'react-select/dist/declarations/src/Select';
import { twMerge } from 'tailwind-merge';

interface IOption {
  id: string;
  name: string;
}

const Control = <TOption extends IOption>({
  children,
  ...props
}: ControlProps<TOption>) => (
  <components.Control
    className="rounded border border-alpha-2 bg-alpha-1 p-1 text-fg-1 focus-within:ring-1 focus-within:ring-accent-2 hover:cursor-pointer hover:border-alpha-3"
    {...props}
  >
    {children}
  </components.Control>
);

const DropdownIndicator = () => <ChevronUpDownIcon className="mr-1 w-5" />;

const Input = <TOption extends IOption>({
  children,
  ...props
}: InputProps<TOption>) => (
  <components.Input className="m-1 px-2" {...props}>
    {children}
  </components.Input>
);

const Menu = <TOption extends IOption>({
  children,
  ...props
}: MenuProps<TOption>) => (
  <components.Menu
    className="mt-2 overflow-hidden rounded border border-alpha-2 bg-bg-1 py-2 text-fg-1 shadow-xl focus-within:ring-1 focus-within:ring-accent-2"
    {...props}
  >
    {children}
  </components.Menu>
);

const MultiValueContainer = ({
  children,
  ...props
}: MultiValueGenericProps) => (
  <components.MultiValueContainer {...props}>
    <div className="m-1 inline-flex items-center gap-2 rounded-[0.15rem] bg-alpha-2 pl-2">
      {children}
    </div>
  </components.MultiValueContainer>
);

const MultiValueRemove = ({ children, ...props }: MultiValueRemoveProps) => (
  <components.MultiValueRemove {...props}>
    <div className="group -m-1 p-1 pr-2">
      <XMarkIcon className="w-5 text-fg-2 transition-colors group-hover:text-fg-1" />
    </div>
  </components.MultiValueRemove>
);

const NoOptionsMessage = <TOption extends IOption>({
  children,
  ...props
}: NoticeProps<TOption>) => (
  <components.NoOptionsMessage
    className="px-4 py-2 text-center text-fg-2"
    {...props}
  >
    {children}
  </components.NoOptionsMessage>
);

const Option = <TOption extends IOption>({
  children,
  ...props
}: OptionProps<TOption>) => (
  <components.Option
    className={twMerge(
      'flex items-center px-4 py-2 text-fg-2 transition-colors hover:cursor-pointer hover:bg-alpha-1 hover:text-fg-1',
      props.isFocused && 'bg-alpha-1 text-fg-1'
    )}
    {...props}
  >
    {children}
  </components.Option>
);

const Placeholder = <TOption extends IOption>({
  children,
  ...props
}: PlaceholderProps<TOption>) => (
  <components.Placeholder className="m-1 px-2 text-alpha-3" {...props}>
    {children}
  </components.Placeholder>
);

const SingleValue = <TOption extends IOption>({
  children,
  ...props
}: SingleValueProps<TOption>) => (
  <components.SingleValue className="m-1 px-2" {...props}>
    {children}
  </components.SingleValue>
);

const Select = forwardRef(
  <TOption extends IOption>(
    props: ReactSelectProps<TOption>,
    ref: Ref<ReactSelectDeclaration<TOption>>
  ) => (
    <ReactSelect
      closeMenuOnSelect={!props.isMulti}
      components={{
        Control,
        DropdownIndicator,
        Input,
        Menu,
        MultiValueContainer,
        MultiValueRemove,
        NoOptionsMessage,
        Option,
        Placeholder,
        SingleValue,
      }}
      getOptionLabel={(option) => option.name}
      getOptionValue={(option) => option.id}
      instanceId={props.name}
      isClearable={false}
      isSearchable={false}
      ref={ref}
      unstyled
      {...props}
    />
  )
);

Select.displayName = 'Select';
export default Select;
