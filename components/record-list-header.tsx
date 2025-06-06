import { RecordCreateForm } from '@/components/record-create-form';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/queries/use-profile';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

export const RecordListHeader = ({ logId }: { logId?: string }) => {
  const [formVisible, setFormVisible] = useState(false);
  const profile = useProfile();

  const placeholder = useMemo(
    () => `What's on your mind, ${profile.name?.split(' ')[0]}?`,
    [profile.name]
  );

  return (
    <View className="mt-3 md:mt-8" style={{ borderCurve: 'continuous' }}>
      {formVisible ? (
        <RecordCreateForm
          logId={logId}
          onEmptyBlur={() => setFormVisible(false)}
        />
      ) : (
        <Button
          className="cursor-text justify-start"
          onPress={() => setFormVisible(true)}
          variant="secondary"
        >
          <Text className="font-normal text-placeholder">{placeholder}</Text>
        </Button>
      )}
    </View>
  );
};
