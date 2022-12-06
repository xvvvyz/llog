import clsx from 'clsx';
import { useField } from 'formik';
import { InputHTMLAttributes } from 'react';

const Input = ({ className, name, ...rest }: InputHTMLAttributes<HTMLInputElement>) => {
  const [field] = useField(name ?? '');
  return <input className={clsx('input', className)} {...field} {...rest} />;
};

export default Input;
