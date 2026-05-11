import { useCopy } from '@/hooks/use-copy';
import { useSheetManager } from '@/hooks/use-sheet-manager';
import { alert } from '@/lib/alert';
import { apiOrThrow } from '@/lib/api';
import { getDateLabel } from '@/lib/time';
import { Button } from '@/ui/button';
import { Icon } from '@/ui/icon';
import { Sheet } from '@/ui/sheet';
import { SheetFooter, SheetListScrollView } from '@/ui/sheet-list';
import { Spinner } from '@/ui/spinner';
import { Text } from '@/ui/text';
import { ArrowSquareOut, Check, Copy, Trash } from 'phosphor-react-native';
import * as React from 'react';
import { Linking, View } from 'react-native';
import * as inputGroup from '@/ui/input-group';

type Grant = {
  clientId: string;
  createdAt: number;
  expiresAt?: number;
  id: string;
  metadata?: { clientName?: string; clientUri?: string };
  scope: string[];
};

const mcpUrl = `${process.env.EXPO_PUBLIC_APP_URL ?? ''}/mcp`;

const MCP_PROVIDER_LINKS = [
  { label: 'ChatGPT', url: 'https://platform.openai.com/docs/developer-mode' },
  {
    label: 'Claude',
    url: 'https://support.anthropic.com/en/articles/11175166-getting-started-with-custom-integrations-using-remote-mcp',
  },
];

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
      <SheetListScrollView contentContainerClassName="gap-5 py-5">
        {grants.length > 0 ? (
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
                    size="icon-xs"
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
        ) : (
          <View className="mx-auto max-w-56 w-full gap-3 items-center md:py-6">
            <Text className="text-center text-muted-foreground">
              Connect an AI app with the MCP server URL below.
            </Text>
            <View className="flex-row flex-wrap gap-x-5 justify-center">
              {MCP_PROVIDER_LINKS.map((link) => (
                <Button
                  key={link.url}
                  onPress={() => void Linking.openURL(link.url)}
                  variant="link"
                >
                  <Text>{link.label}</Text>
                  <Icon
                    className="text-muted-foreground"
                    icon={ArrowSquareOut}
                  />
                </Button>
              ))}
            </View>
          </View>
        )}
      </SheetListScrollView>
      <SheetFooter contentClassName="gap-3">
        <inputGroup.InputGroup>
          <inputGroup.InputGroupInput editable={false} value={mcpUrl} />
          <inputGroup.InputGroupButton
            onPress={() => copy(mcpUrl)}
            size="icon-sm"
          >
            <Icon icon={copied ? Check : Copy} />
          </inputGroup.InputGroupButton>
        </inputGroup.InputGroup>
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
