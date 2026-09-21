import { trpc } from "@/lib/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const meQuery = trpc.localAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.localAuth.logout.useMutation({
    onSuccess: () => {
      utils.localAuth.me.setData(undefined, null);
      window.location.href = "/login";
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      window.location.href = "/login";
    }
  }, [logoutMutation]);

  const state = useMemo(() => {
    return {
      user: meQuery.data ?? null,
      loading: meQuery.isLoading || logoutMutation.isPending,
      error: meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(meQuery.data),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
