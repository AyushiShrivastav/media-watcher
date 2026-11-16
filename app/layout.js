import './globals.css';

export const metadata = {
  title: 'Media Watcher',
  description: 'See the narratives forming about a public figure in the news, and the PR options for each.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
