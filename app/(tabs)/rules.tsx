import { RuleListEmptyState } from '@/components/rule-list-empty-state';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { List } from '@/components/ui/list';
import { Loading } from '@/components/ui/loading';
import { Text } from '@/components/ui/text';
import { createRule } from '@/mutations/create-rule';
import { deleteRule } from '@/mutations/delete-rule';
import { updateRule } from '@/mutations/update-rule';
import { useRules } from '@/queries/use-rules';
import { Plus } from 'lucide-react-native';
import { Fragment } from 'react';
import { View } from 'react-native';

export default function Rules() {
  const rules = useRules();

  return (
    <Fragment>
      <Header
        title="Rules"
        right={
          <Button
            className="size-10"
            onPress={() => createRule({ prompt: '' })}
            size="icon"
            variant="link"
            wrapperClassName="md:-mr-2.5"
          >
            <Icon className="text-foreground" icon={Plus} />
          </Button>
        }
      />
      {rules.isLoading ? (
        <Loading />
      ) : !rules.data.length ? (
        <RuleListEmptyState />
      ) : (
        <List
          contentContainerClassName="mx-auto w-full max-w-xl p-3 pt-0 md:p-8 md:pt-5"
          data={rules.data}
          estimatedItemSize={112}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          renderItem={({ item: rule }) => (
            <View className="mt-3 gap-3 rounded-2xl border border-border-secondary bg-card p-4">
              <Input
                className="h-auto pb-16 pt-2.5 leading-normal"
                lineBreakModeIOS="wordWrapping"
                maxLength={10240}
                multiline
                onChangeText={(text) =>
                  updateRule({ id: rule.id, prompt: text })
                }
                returnKeyType="default"
                submitBehavior="newline"
                value={rule.prompt}
              />
              <Button
                onPress={() => deleteRule({ id: rule.id })}
                variant="destructive"
              >
                <Text>Delete</Text>
              </Button>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </Fragment>
  );
}
