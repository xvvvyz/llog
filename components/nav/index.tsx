import Button from '/components/button';
import SignOutButton from '/components/sign-out-button';

const Nav = () => (
  <nav className="flex items-start justify-between gap-3 leading-none text-fg-2">
    <div className="flex flex-wrap gap-6">
      <Button activeClassName="text-fg-1" href="/subjects" variant="unstyled">
        Subjects
      </Button>
      <Button activeClassName="text-fg-1" href="/templates" variant="unstyled">
        Templates
      </Button>
      <div className="flex gap-6">
        <Button
          activeClassName="text-fg-1"
          href="/observations"
          variant="unstyled"
        >
          Observations
        </Button>
        <Button activeClassName="text-fg-1" href="/inputs" variant="unstyled">
          Inputs
        </Button>
      </div>
    </div>
    <SignOutButton />
  </nav>
);

export default Nav;
