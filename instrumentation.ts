export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'Pages Router' | 'App Router';
    routeType: 'render' | 'route' | 'action' | 'middleware';
    routePath: string;
    revalidateReason: 'on-demand' | 'stale' | undefined;
    renderSource: 'react-server-components' | 'react-server-components-payload' | undefined;
  },
): Promise<void> {
  const Sentry = await import('@sentry/nextjs');

  Sentry.withScope((scope) => {
    scope.setTags({
      routerKind: context.routerKind,
      routeType: context.routeType,
      routePath: context.routePath,
    });

    scope.setContext('nextjs', {
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: context.renderSource,
      revalidateReason: context.revalidateReason,
    });

    scope.setContext('request', {
      method: request.method,
      url: request.path,
    });

    Sentry.captureException(err, {
      mechanism: {
        type: 'instrument',
        handled: false,
      },
    });
  });
}
