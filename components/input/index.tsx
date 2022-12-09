import { useField } from 'formik';
import { InputHTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

const Input = ({
  className,
  name,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) => {
  const [field] = useField(name ?? '');

  return (
    <input
      className={twMerge(
        'w-full rounded border border-alpha-2 bg-bg-3 px-4 py-3 text-fg-1 ring-accent-1 placeholder:text-fg-3 hover:border-alpha-3 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
      {...field}
      {...rest}
    />
  );
};

export default Input;
