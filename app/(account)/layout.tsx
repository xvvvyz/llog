import Link from 'next/link';
import { ReactNode } from 'react';
import SignOutButton from '/components/sign-out-button';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => (
  <div className="mx-auto flex max-w-lg flex-col justify-center gap-12 py-12 px-6">
    <nav className="flex flex-wrap gap-6">
      <Link href="/subjects">Subjects</Link>
      {/*<Link href="#">Templates</Link>*/}
      {/*<Link href="#">Observations</Link>*/}
      {/*<Link href="#">Inputs</Link>*/}
      <SignOutButton className="ml-auto" />
    </nav>
    {children}
  </div>
);

export default Layout;
