import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import appJson from '../../app.json';

const MAX = 200;

type Entry = { t: number; level: 'info' | 'warn' | 'error'; msg: string };

const ring: Entry[] = [];

export function logDebug(level: Entry['level'], msg: string): void {
  ring.push({ t: Date.now(), level, msg });
  if (ring.length > MAX) ring.shift();
}

export type DiagnosticReport = {
  timestamp: string;
  app: {
    version: string;
    buildNumber: string;
    nativeAppVersion: string;
  };
  device: {
    brand: string | null;
    modelName: string | null;
    osName: string | null;
    osVersion: string | null;
    isDevice: boolean | null;
  };
  logs: string[];
};

export function buildDiagnosticReport(): DiagnosticReport {
  return {
    timestamp: new Date().toISOString(),
    app: {
      version: appJson.expo.version ?? 'unknown',
      buildNumber: Application.nativeBuildVersion ?? 'unknown',
      nativeAppVersion: Application.nativeApplicationVersion ?? 'unknown',
    },
    device: {
      brand: Device.brand ?? null,
      modelName: Device.modelName ?? null,
      osName: Device.osName ?? Platform.OS,
      osVersion: Device.osVersion ?? null,
      isDevice: Device.isDevice ?? null,
    },
    logs: ring.map((e) => `${new Date(e.t).toISOString()} [${e.level}] ${e.msg}`),
  };
}

export function exportDebugLog(): string {
  const report = buildDiagnosticReport();
  const header = [
    `Drop Diagnostic Report`,
    `Generated: ${report.timestamp}`,
    ``,
    `App: v${report.app.version} (build ${report.app.buildNumber}, native ${report.app.nativeAppVersion})`,
    `Device: ${report.device.brand ?? ''} ${report.device.modelName ?? ''}`,
    `OS: ${report.device.osName ?? ''} ${report.device.osVersion ?? ''}`,
    `Physical device: ${report.device.isDevice ?? 'unknown'}`,
    ``,
    `--- Debug Log (${report.logs.length} entries) ---`,
    ``,
  ].join('\n');

  return header + report.logs.join('\n');
}
