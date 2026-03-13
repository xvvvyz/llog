import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import * as RadioGroup from '@/components/ui/radio-group';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { useSheetManager } from '@/context/sheet-manager';
import { Role } from '@/enums/roles';
import { inviteMember } from '@/mutations/invite-member';
import { useUi } from '@/queries/use-ui';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

const ROLES = [
  { value: Role.Owner, label: 'Owner', description: 'Full access' },
  { value: Role.Admin, label: 'Admin', description: 'Manage members and logs' },
  {
    value: Role.Recorder,
    label: 'Recorder',
    description: 'Create and reply to records',
  },
];

export const InviteMemberSheet = () => {
  const sheetManager = useSheetManager();
  const { activeTeamId } = useUi();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>(Role.Recorder);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = useCallback(async () => {
    if (!activeTeamId || !email.trim()) return;

    setError('');
    setIsLoading(true);

    try {
      await inviteMember({ teamId: activeTeamId, email: email.trim(), role });
      setEmail('');
      setRole(Role.Recorder);
      sheetManager.close('invite-member');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to invite member');
    } finally {
      setIsLoading(false);
    }
  }, [activeTeamId, email, role, sheetManager]);

  const handleDismiss = useCallback(() => {
    sheetManager.close('invite-member');
    setEmail('');
    setRole(Role.Recorder);
    setError('');
  }, [sheetManager]);

  return (
    <Sheet
      onDismiss={handleDismiss}
      open={sheetManager.isOpen('invite-member')}
      portalName="invite-member"
    >
      <View className="mx-auto w-full max-w-md p-8">
        <View>
          <Label>Email</Label>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="email@example.com"
            value={email}
          />
        </View>
        <View className="mt-4">
          <Label>Role</Label>
          <RadioGroup.Root
            className="gap-2"
            onValueChange={setRole}
            value={role}
          >
            {ROLES.map((r) => (
              <RadioGroup.Item
                description={r.description}
                key={r.value}
                label={r.label}
                value={r.value}
              />
            ))}
          </RadioGroup.Root>
        </View>
        {error ? (
          <Text className="mt-4 text-center text-destructive">{error}</Text>
        ) : null}
        <Button
          disabled={isLoading || !email.trim()}
          onPress={handleInvite}
          wrapperClassName="mt-8"
        >
          <Text>{isLoading ? 'Inviting…' : 'Send invite'}</Text>
        </Button>
        <Button
          onPress={handleDismiss}
          variant="secondary"
          wrapperClassName="mt-3"
        >
          <Text>Cancel</Text>
        </Button>
      </View>
    </Sheet>
  );
};
