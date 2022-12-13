import Button from '/components/button';
import SignOutButton from '/components/sign-out-button';

const Nav = () => (
  <nav className="flex items-start justify-between gap-3 leading-none">
    <div className="flex flex-wrap gap-6">
      <Button activeClassName="text-fg-2" href="/subjects" variant="unstyled">
        Subjects
      </Button>
      <Button activeClassName="text-fg-2" href="/templates" variant="unstyled">
        Templates
      </Button>
      <div className="flex gap-6">
        <Button
          activeClassName="text-fg-2"
          href="/observations"
          variant="unstyled"
        >
          Observations
        </Button>
        <Button activeClassName="text-fg-2" href="/inputs" variant="unstyled">
          Inputs
        </Button>
      </div>
    </div>
    <SignOutButton />
  </nav>
);

export default Nav;
