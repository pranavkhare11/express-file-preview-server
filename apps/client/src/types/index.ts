export interface User {
  id: string;
  name: string;
  email: string;
}

export interface VfsItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size?: number;
  mimeType?: string;
  status?: 'ready' | 'processing' | 'failed';
  progress?: number;
  updatedAt: string;
  createdAt: string;
  parentId?: string | null;
  storageFileId?: string;
}

export interface VfsExplorerResponse {
  currentFolder: {
    id: string;
    name: string;
  } | null;
  breadcrumbs: Array<{ id: string; name: string }>;
  folders: VfsItem[];
  files: VfsItem[];
}

