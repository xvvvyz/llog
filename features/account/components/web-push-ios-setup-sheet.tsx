import { useSheetManager } from '@/hooks/use-sheet-manager';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { Text } from '@/ui/text';
import { BellRinging } from 'phosphor-react-native/lib/module/icons/BellRinging';
import { CaretCircleDown } from 'phosphor-react-native/lib/module/icons/CaretCircleDown';
import { DotsThreeCircle } from 'phosphor-react-native/lib/module/icons/DotsThreeCircle';
import { Export } from 'phosphor-react-native/lib/module/icons/Export';
import { PlusSquare } from 'phosphor-react-native/lib/module/icons/PlusSquare';
import * as React from 'react';
import { View } from 'react-native';

type Step = {
  icon?: React.ComponentProps<typeof Icon>['icon'];
  prefix?: string;
  text: string;
};

export const WebPushIosSetupSheet = () => {
  const sheetManager = useSheetManager();

  const steps: Step[] = [
    { icon: DotsThreeCircle, prefix: 'Tap', text: 'in the bottom right' },
    { icon: Export, prefix: 'Tap', text: 'Share' },
    { icon: CaretCircleDown, prefix: 'Tap', text: 'View More' },
    { icon: PlusSquare, prefix: 'Tap', text: 'Add to Home Screen' },
    { text: 'Open from Home Screen' },
    { text: 'Sign in to your account' },
    { text: 'Enable web notifications' },
  ];

  return (
    <Sheet
      onDismiss={() => sheetManager.close('web-push-ios-setup')}
      open={sheetManager.isOpen('web-push-ios-setup')}
      portalName="web-push-ios-setup"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <Icon
          className="text-primary mb-6 self-center"
          icon={BellRinging}
          size={64}
        />
        <Text className="text-center text-2xl">Web notifications on iOS</Text>
        <View
          className="bg-input mt-8 gap-2.5 rounded-2xl px-6 py-5"
          style={{ borderCurve: 'continuous' }}
        >
          {steps.map((step, index) => (
            <View className="flex-row items-start" key={step.text}>
              <Text className="text-placeholder w-7 pr-2">{index + 1}.</Text>
              <View className="min-w-0 flex-1 flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
                {step.prefix && (
                  <Text className="text-muted-foreground">{step.prefix}</Text>
                )}
                {step.icon && (
                  <Icon
                    className="text-muted-foreground"
                    icon={step.icon}
                    size={20}
                  />
                )}
                <Text className="text-muted-foreground">{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
        <Button
          className="web:hover:opacity-90"
          onPress={() => sheetManager.close('web-push-ios-setup')}
          wrapperClassName="mt-12"
        >
          <Text>Got it</Text>
        </Button>
      </View>
    </Sheet>
  );
};
