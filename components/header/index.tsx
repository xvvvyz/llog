import { ReactNode } from 'react';

interface HeaderProps {
  children: ReactNode;
}

const Header = ({ children }: HeaderProps) => (
  <header className="flex h-9 items-center justify-between">{children}</header>
);

export default Header;
