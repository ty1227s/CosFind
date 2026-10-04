type PageLoadingProps = {
  message?: string;
};

export function PageLoading({ message = "読み込んでいます…" }: PageLoadingProps) {
  return <main className="product-route-loading" role="status" aria-live="polite"><i aria-hidden="true"/><span>{message}</span></main>;
}
