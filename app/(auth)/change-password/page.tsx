import ChangePasswordForm from '(auth)/change-password/components/change-password-form';
import Card from 'components/card';

const Page = () => (
  <Card breakpoint="sm">
    <h1 className="text-2xl">Change your password</h1>
    <ChangePasswordForm />
  </Card>
);

export default Page;
