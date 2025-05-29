import { BottomSheetLoading } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SPECTRUM } from '@/theme/spectrum';
import { db } from '@/utilities/db';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Fragment } from 'react';
import { View } from 'react-native';

export const LogEditForm = ({ logId }: { logId: string }) => {
  const colorScheme = useColorScheme();

  const { data, isLoading } = db.useQuery({
    logs: { $: { where: { id: logId } } },
  });

  const log = data?.logs?.[0];
  const isDark = colorScheme === 'dark';

  return (
    <Fragment>
      {isLoading && <BottomSheetLoading />}
      <BottomSheetView>
        <View className="mx-auto w-full max-w-md p-8">
          <View>
            <Label nativeID="name">Name</Label>
            <Input
              aria-labelledby="name"
              autoCapitalize="none"
              autoComplete="off"
              bottomSheet
              defaultValue={log?.name}
              maxLength={40}
              onChangeText={(name) => {
                if (!log) return;
                db.transact(db.tx.logs[log.id].update({ name }));
              }}
              returnKeyType="done"
            />
          </View>
          <View className="mt-8">
            <View className="gap-2">
              {[
                [11, 0, 9, 8, 7, 6],
                [10, 1, 2, 3, 4, 5],
              ].map((row, rowIndex) => (
                <View className="flex-row gap-2" key={`row-${rowIndex}`}>
                  {row.map((color) => (
                    <Button
                      className="h-full w-full rounded-full border-4"
                      key={`color-${color}`}
                      onPress={() => {
                        if (!log) return;
                        db.transact(db.tx.logs[log.id].update({ color }));
                      }}
                      ripple="default"
                      style={{
                        backgroundColor:
                          SPECTRUM[colorScheme][color][
                            log?.color === color
                              ? isDark
                                ? 'darker'
                                : 'lighter'
                              : 'default'
                          ],
                        borderColor:
                          SPECTRUM[colorScheme][color][
                            log?.color === color
                              ? isDark
                                ? 'lighter'
                                : 'darker'
                              : 'default'
                          ],
                      }}
                      variant="ghost"
                      wrapperClassName="shrink w-16 aspect-square rounded-full"
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
        </View>
      </BottomSheetView>
    </Fragment>
  );
};
