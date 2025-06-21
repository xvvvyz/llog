import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Sparkles } from 'lucide-react-native';
import { Fragment } from 'react';
import { View } from 'react-native';

export default function Activity() {
  return (
    <Fragment>
      <Header title="Activity" />
      <View className="flex-1 items-center justify-center gap-8 py-8">
        <Icon className="text-primary" icon={Sparkles} size={64} />
      </View>
    </Fragment>
  );
}
