import SignOutButton from '(account)/components/sign-out-button';
import Button from 'components/button';

const Nav = () => (
  <nav className="flex items-start justify-between gap-3 leading-none text-fg-2">
    <div className="flex flex-wrap gap-6">
      <div className="flex gap-6">
        <Button activeClassName="text-fg-1" href="/subjects" variant="link">
          Subjects
        </Button>
        <Button activeClassName="text-fg-1" href="/observations" variant="link">
          Observations
        </Button>
      </div>
      <div className="flex gap-6">
        <Button activeClassName="text-fg-1" href="/inputs" variant="link">
          Inputs
        </Button>
        <Button activeClassName="text-fg-1" variant="link">
          Templates
        </Button>
        <Button activeClassName="text-fg-1" variant="link">
          Insights
        </Button>
      </div>
    </div>
    <SignOutButton />
  </nav>
);

export default Nav;
