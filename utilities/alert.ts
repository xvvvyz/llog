import { Alert as NativeAlert, Platform } from 'react-native';

export const alert = ({
  message,
  title,
}: {
  message: string;
  title: string;
}) => {
  if (Platform.OS === 'web') {
    window.alert(message);
    return;
  }

  NativeAlert.alert(title, message);
};
