import ChangePasswordForm from '../../../components/change-password-form';
import Card from '/components/card';

const Page = () => (
  <Card breakpoint="xs">
    <h1 className="text-2xl font-bold">Change your password</h1>
    <ChangePasswordForm />
  </Card>
);

export default Page;
