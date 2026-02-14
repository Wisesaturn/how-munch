import * as React from 'react';

export function createSafeContext<ContextValueType extends object | null>(
  rootComponentName: string,
  defaultContext?: ContextValueType,
) {
  const Context = React.createContext<ContextValueType | undefined>(defaultContext);

  function Provider(props: React.PropsWithChildren<ContextValueType>) {
    const { children, ...context } = props;
    const value = React.useMemo(() => context, [context]) as ContextValueType;
    return React.createElement(Context.Provider, { value }, children);
  }

  function useContext(consumerName?: string) {
    const context = React.useContext(Context);
    if (context) return context;
    if (defaultContext !== undefined) return defaultContext;
    throw new Error(
      `\`${consumerName || rootComponentName}\`은 반드시 ${rootComponentName}Provider 안에서 사용해야 합니다`,
    );
  }

  Provider.displayName = rootComponentName + 'Provider';
  return [Provider, useContext] as const;
}
