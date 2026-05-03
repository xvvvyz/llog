import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { apiOrThrow } from '@/lib/api';
import { getDateLabel } from '@/lib/time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { Check, Copy, Trash } from 'phosphor-react-native';
import * as React from 'react';
import { View } from 'react-native';

type Grant = {
  clientId: string;
  createdAt: number;
  expiresAt?: number;
  id: string;
  metadata?: { clientName?: string; clientUri?: string };
  scope: string[];
};

const mcpUrl = `${process.env.EXPO_PUBLIC_APP_URL ?? ''}/mcp`;

export const McpSheet = () => {
  const [grants, setGrants] = React.useState<Grant[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [revokingGrantId, setRevokingGrantId] = React.useState<string>();
  const { copied, copy } = useCopy();
  const sheetManager = useSheetManager();
  const isOpen = sheetManager.isOpen('mcp');

  const refresh = React.useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setIsLoading(true);

    try {
      const response = await apiOrThrow('/oauth/grants');
      const data = (await response.json()) as { grants: Grant[] };
      setGrants(data.grants);
    } catch (error) {
      alert({
        message:
          error instanceof Error ? error.message : 'Failed to load MCP clients',
        title: 'Error',
      });
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) void refresh();
  }, [isOpen, refresh]);

  const revokeGrant = React.useCallback(
    async (grantId: string) => {
      setRevokingGrantId(grantId);

      try {
        await apiOrThrow(`/oauth/grants/${grantId}`, { method: 'DELETE' });
        await refresh({ showLoading: false });
      } catch (error) {
        alert({
          message:
            error instanceof Error ? error.message : 'Failed to revoke client',
          title: 'Error',
        });
      } finally {
        setRevokingGrantId(undefined);
      }
    },
    [refresh]
  );

  return (
    <Sheet
      loading={isLoading}
      onDismiss={() => sheetManager.close('mcp')}
      open={isOpen}
      portalName="mcp"
      variant="list"
    >
      <SheetListScrollView contentContainerClassName="gap-5">
        <View className="flex-row items-center justify-between">
          <Label className="p-0 shrink-0">MCP URL</Label>
          <View className="flex-1 flex-row min-w-0 gap-3 items-center justify-end">
            <Input
              className="flex-1 h-auto min-w-0 px-0 py-0 border-0 rounded-none bg-transparent text-right opacity-100 web:cursor-default"
              editable={false}
              value={mcpUrl}
            />
            <Button
              onPress={() => copy(mcpUrl)}
              size="icon-sm"
              variant="ghost"
              wrapperClassName="-mr-1.5"
            >
              <Icon className="text-placeholder" icon={copied ? Check : Copy} />
            </Button>
          </View>
        </View>
        {grants.length > 0 && (
          <View>
            {grants.map((grant) => {
              const clientName =
                grant.metadata?.clientName ??
                grant.metadata?.clientUri ??
                grant.clientId;

              return (
                <View key={grant.id} className="flex-row gap-3 items-center">
                  <View className="flex-1 flex-row min-w-0 gap-4 items-center justify-between">
                    <Text
                      className="text-muted-foreground text-sm shrink"
                      numberOfLines={1}
                    >
                      {clientName}
                    </Text>
                    <Text
                      className="text-placeholder text-xs shrink-0"
                      numberOfLines={1}
                    >
                      {getDateLabel(grant.createdAt * 1000)}
                    </Text>
                  </View>
                  <Button
                    accessibilityLabel={`Revoke ${clientName}`}
                    disabled={revokingGrantId === grant.id}
                    onPress={() => revokeGrant(grant.id)}
                    size="icon-sm"
                    variant="ghost"
                    wrapperClassName="-mr-1.5"
                  >
                    {revokingGrantId === grant.id ? (
                      <Spinner size="xs" />
                    ) : (
                      <Icon className="text-muted-foreground" icon={Trash} />
                    )}
                  </Button>
                </View>
              );
            })}
          </View>
        )}
      </SheetListScrollView>
      <SheetFooter contentClassName="flex-row gap-4">
        <Button
          onPress={() => sheetManager.close('mcp')}
          size="sm"
          variant="secondary"
          wrapperClassName="flex-1"
        >
          <Text>Close</Text>
        </Button>
      </SheetFooter>
    </Sheet>
  );
};
