import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { status?: number })?.status;
        return failureCount < 2 && status !== 401 && status !== 404;
      },
    },
    mutations: {
      retry: 0,
    },
  },
});
