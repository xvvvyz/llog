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

import { PlusIcon } from '@heroicons/react/20/solid';
import { forwardRef, ReactNode, Ref } from 'react';
import Creatable from 'react-select/creatable';
import ReactSelectDeclaration from 'react-select/dist/declarations/src/Select';
import { twMerge } from 'tailwind-merge';

type IOption =
  | {
      id: string;
      label?: string;
      name?: string;
    }
  | string;

const Control = <TOption extends IOption>({
  children,
  ...props
}: ControlProps<TOption>) => (
  <components.Control className="input p-1" {...props}>
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

const MultiValueContainer = ({
  children,
  ...props
}: MultiValueGenericProps) => (
  <components.MultiValueContainer {...props}>
    <div className="m-1 inline-flex items-center gap-2 rounded-[0.15rem] bg-alpha-2 pl-2 text-sm leading-6">
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
  <components.NoOptionsMessage {...props}>
    {children}
  </components.NoOptionsMessage>
);

const Option = <TOption extends IOption>({
  children,
  ...props
}: OptionProps<TOption>) => (
  <components.Option {...props}>
    <div
      className={twMerge(
        'flex w-full items-center justify-between px-4 py-2 transition-colors hover:cursor-pointer',
        props.isFocused && 'bg-bg-2'
      )}
    >
      {children}
      {props.isMulti && (
        <PlusIcon
          className={twMerge(
            'w-5 text-fg-2 transition-colors',
            props.isFocused && 'text-fg-1'
          )}
        />
      )}
    </div>
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
    {
      creatable,
      menuFooter,
      ...props
    }: ReactSelectProps<TOption> & {
      creatable?: boolean;
      menuFooter?: ReactNode;
    },
    ref: Ref<ReactSelectDeclaration<TOption>>
  ) => {
    const commonProps = {
      closeMenuOnSelect: !props.isMulti,
      components: {
        Control,
        DropdownIndicator,
        Input,
        Menu: ({ children, ...props }: MenuProps<TOption>) => (
          <components.Menu
            className="mt-2 overflow-hidden rounded border border-alpha-2 bg-bg-1 text-fg-1 shadow-2xl"
            {...props}
          >
            {children}
            {menuFooter && (
              <div className="-mt-[1px] flex flex-col items-center border-t border-alpha-1 px-4 py-3">
                {menuFooter}
              </div>
            )}
          </components.Menu>
        ),
        MultiValueContainer,
        MultiValueRemove,
        NoOptionsMessage,
        Option,
        Placeholder,
        SingleValue,
      },
      instanceId: props.name,
      isClearable: false,
      noOptionsMessage: () => '',
      placeholder: <>&nbsp;</>,
      ref: () => ref,
      unstyled: true,
      ...props,
    };

    if (creatable) {
      return <Creatable {...commonProps} />;
    }

    return (
      <ReactSelect
        getOptionLabel={(option) =>
          typeof option === 'string'
            ? option
            : option.label ?? option.name ?? ''
        }
        getOptionValue={(option) =>
          typeof option === 'string' ? option : option.id
        }
        {...commonProps}
      />
    );
  }
);

Select.displayName = 'Select';
export default Select;
