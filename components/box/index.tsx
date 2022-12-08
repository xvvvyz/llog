import { ElementType, HTMLAttributes } from 'react';

interface BoxProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

const Box = ({ as: Component = 'div', children, ...rest }: BoxProps) => (
  <Component {...rest}>{children}</Component>
);

export type { BoxProps };
export default Box;
