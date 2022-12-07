import ResetPasswordForm from './components/reset-password-form';
import Card from '/components/card';

const ResetPasswordPage = () => (
  <Card>
    <h1 className="text-2xl">Set your new password</h1>
    <ResetPasswordForm />
  </Card>
);

export default ResetPasswordPage;
