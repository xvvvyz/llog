import Button from '/components/button';
import SignOutButton from '/components/sign-out-button';

const Nav = () => (
  <nav className="flex items-start justify-between gap-6 leading-none">
    <div className="flex flex-wrap gap-6">
      <Button href="/subjects" isNavLink variant="unstyled">
        Subjects
      </Button>
      <Button href="/templates" isNavLink variant="unstyled">
        Templates
      </Button>
      <div className="flex gap-6">
        <Button href="/observations" isNavLink variant="unstyled">
          Observations
        </Button>
        <Button href="/inputs" isNavLink variant="unstyled">
          Inputs
        </Button>
      </div>
    </div>
    <SignOutButton className="shrink-0" />
  </nav>
);

export default Nav;
