import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          content="width=device-width, initial-scale=1, shrink-to-fit=no, interactive-widget=resizes-content"
          name="viewport"
        />
        <ScrollViewStyleReset />
      </head>
      <body className="bg-background">{children}</body>
    </html>
  );
}
