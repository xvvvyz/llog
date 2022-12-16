import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/24/solid';
import { Fragment, useState } from 'react';

interface Option {
  label: string;
  [key: string]: unknown;
}

interface SelectProps {
  className?: string;
  defaultOption?: Option | null;
  options: Option[];
  placeholder?: string;
}

const Select = ({
  className,
  defaultOption = null,
  options,
  placeholder = 'Select an option',
}: SelectProps) => {
  const [selectedOption, setSelectedOption] = useState(defaultOption);

  return (
    <Listbox
      as="div"
      className="relative w-full"
      onChange={setSelectedOption}
      value={selectedOption}
    >
      <Listbox.Button className={className}>
        {selectedOption?.label ?? placeholder}
        <ChevronUpDownIcon aria-hidden="true" className="w-5 fill-fg-2" />
      </Listbox.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="transform opacity-0 -translate-y-1"
        enterTo="transform opacity-100 translate-y-0"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 translate-y-0"
        leaveTo="transform opacity-0 -translate-y-1"
      >
        <Listbox.Options className="absolute z-10 mt-2 w-full divide-y divide-alpha-1 overflow-hidden rounded border border-alpha-2 bg-alpha-1 shadow-lg ring-accent-2 focus:outline-none focus:ring-1">
          <div className="p-1">
            {options.map((option) => (
              <Listbox.Option
                className="flex w-full cursor-pointer rounded px-3 py-2 text-left text-fg-2 ui-active:bg-alpha-1 ui-active:text-fg-1"
                key={option.label}
                value={option}
              >
                {option.label}
              </Listbox.Option>
            ))}
          </div>
        </Listbox.Options>
      </Transition>
    </Listbox>
  );
};

export default Select;
