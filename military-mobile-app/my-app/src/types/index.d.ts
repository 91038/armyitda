// react-native-view-shot 타입 정의
declare module 'react-native-view-shot' {
  import { Component } from 'react';
  import { ViewProps } from 'react-native';

  export interface ViewShotOptions {
    format?: 'png' | 'jpg' | 'jpeg' | 'webm' | 'raw';
    quality?: number;
    result?: 'file' | 'base64' | 'data-uri';
    snapshotContentContainer?: boolean;
    width?: number;
    height?: number;
  }

  export interface ViewShotProperties extends ViewProps {
    options?: ViewShotOptions;
    captureMode?: 'mount' | 'continuous' | 'update';
    onCapture?: (uri: string) => void;
    onCaptureFailure?: (error: Error) => void;
  }

  export default class ViewShot extends Component<ViewShotProperties> {
    capture(): Promise<string>;
  }
}

// react-native-html-to-pdf 타입 정의
declare module 'react-native-html-to-pdf' {
  export interface HTMLtoPDFOptions {
    html: string;
    fileName?: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
  }

  export interface HTMLtoPDFResponse {
    filePath: string;
    base64?: string;
  }

  const RNHTMLtoPDF: {
    convert(options: HTMLtoPDFOptions): Promise<HTMLtoPDFResponse>;
  };
  
  export default RNHTMLtoPDF;
}

// react-native-fs 타입 정의
declare module 'react-native-fs' {
  export const DocumentDirectoryPath: string;
  export const ExternalStorageDirectoryPath: string;
  export const ExternalDirectoryPath: string;
  export const TemporaryDirectoryPath: string;
  export const LibraryDirectoryPath: string;
  export const PicturesDirectoryPath: string;
  export const CachesDirectoryPath: string;
  export const MainBundlePath: string;

  export function readDir(path: string): Promise<ReadDirItem[]>;
  export function readFile(path: string, encoding?: string): Promise<string>;
  export function writeFile(path: string, content: string, encoding?: string): Promise<void>;
  export function unlink(path: string): Promise<void>;
  export function exists(path: string): Promise<boolean>;
  export function mkdir(path: string): Promise<void>;
  export function copyFile(src: string, dest: string): Promise<void>;
  export function moveFile(src: string, dest: string): Promise<void>;

  export interface ReadDirItem {
    name: string;
    path: string;
    size: number;
    isFile: () => boolean;
    isDirectory: () => boolean;
  }
}

// react-native-share 타입 정의
declare module 'react-native-share' {
  export interface ShareOptions {
    title?: string;
    message?: string;
    url?: string;
    urls?: string[];
    type?: string;
    subject?: string;
    email?: string;
    failOnCancel?: boolean;
    showAppsToView?: boolean;
  }

  export interface ShareResponse {
    success: boolean;
    message: string;
  }

  const Share: {
    open(options: ShareOptions): Promise<ShareResponse>;
    shareSingle(options: ShareOptions & { social: string }): Promise<ShareResponse>;
  };
  
  export default Share;
} 