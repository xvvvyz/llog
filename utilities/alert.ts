import { Alert as NativeAlert, Platform } from 'react-native';

export const alert = ({
  message,
  title,
}: {
  message: string;
  title: string;
}) => {
  Platform.select({
    default: NativeAlert.alert(title, message),
    web: window.alert(message),
  });
};
