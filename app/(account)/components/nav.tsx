import SignOutButton from '(account)/components/sign-out-button';
import Button from 'components/button';

const Nav = () => (
  <nav className="flex items-start justify-between gap-3 leading-none text-fg-2">
    <div className="flex flex-wrap gap-6">
      <Button activeClassName="text-fg-1" href="/subjects" variant="link">
        Subjects
      </Button>
      <Button activeClassName="text-fg-1" href="/observations" variant="link">
        Observations
      </Button>
    </div>
    <SignOutButton />
  </nav>
);

export default Nav;
