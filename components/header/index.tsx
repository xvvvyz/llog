import { ReactNode } from 'react';

interface HeaderProps {
  children: ReactNode;
}

const Header = ({ children }: HeaderProps) => (
  <header className="mt-12 mb-9 flex h-9 items-center justify-between">
    {children}
  </header>
);

export default Header;
