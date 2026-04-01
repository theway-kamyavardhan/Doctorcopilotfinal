export const swrConfig = {
  revalidateOnFocus: false,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  shouldRetryOnError: false,
  dedupingInterval: 60_000,
  keepPreviousData: true,
};

export default swrConfig;
