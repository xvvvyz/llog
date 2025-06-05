import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { View } from 'react-native';
import { RecordCreateForm } from './record-create-form';

export const RecordListHeader = ({
  logId,
  placeholder,
}: {
  logId?: string;
  placeholder: string;
}) => {
  const [formVisible, setFormVisible] = useState(false);

  return (
    <View className="mt-3 md:mt-8" style={{ borderCurve: 'continuous' }}>
      {formVisible ? (
        <RecordCreateForm
          logId={logId}
          onEmptyBlur={() => setFormVisible(false)}
          placeholder={placeholder}
        />
      ) : (
        <Button
          className="h-auto cursor-text justify-start py-3"
          onPress={() => setFormVisible(true)}
          variant="ghost"
          wrapperClassName="bg-input"
        >
          <Text className="font-normal text-placeholder">{placeholder}</Text>
        </Button>
      )}
    </View>
  );
};
