import { execSync } from 'node:child_process';

/**
 * Descubre el socket devtools del webview en el dispositivo conectado por adb
 * y lo reenvía al host para poder conectar Playwright vía CDP.
 *
 * Requisitos:
 *  - adb en el PATH y un dispositivo autorizado (`adb devices`).
 *  - WebView debugging habilitado en la app (WebView.setWebContentsDebuggingEnabled(true)).
 */
export function forwardWebviewDevtools(port = 9222): string {
  const sockets = execSync('adb shell cat /proc/net/unix').toString();
  const match = sockets.match(/@?(webview_devtools_remote[^\s]*)/);
  if (!match) {
    throw new Error(
      'No se encontró el socket webview_devtools_remote. ' +
        'Verifica que el WebView debugging esté habilitado en la app.',
    );
  }
  const socket = match[1].trim();
  execSync(`adb forward tcp:${port} localabstract:${socket}`);
  return `http://127.0.0.1:${port}`;
}

export function listDevices(): string[] {
  return execSync('adb devices')
    .toString()
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t')[0])
    .filter(Boolean);
}
