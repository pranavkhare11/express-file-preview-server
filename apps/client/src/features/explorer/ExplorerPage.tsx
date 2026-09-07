import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../../api/apiClient';
import type { VfsItem, VfsExplorerResponse } from '../../types';
import {
  ExplorerContainer,
  TopBar,
  BreadcrumbBar,
  CrumbItem,
  CrumbSeparator,
  ActionToolbar,
  Button,
  MainArea,
  GridContainer,
  ItemCard,
  ItemIcon,
  ItemName,
  ItemMeta,
  ContextMenuOverlay,
  ContextMenuItem,
} from './ExplorerPage.styles';

interface ExplorerPageProps {
  onBack: () => void;
}

export const ExplorerPage: React.FC<ExplorerPageProps> = ({ onBack }) => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; name: string }>>([]);
  const [folders, setFolders] = useState<VfsItem[]>([]);
  const [files, setFiles] = useState<VfsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedItem, setSelectedItem] = useState<VfsItem | null>(null);
  const [clipboard, setClipboard] = useState<{ item: VfsItem; action: 'copy' | 'cut' } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; item: VfsItem | null } | null>(null);

  // Media Preview Modal state
  const [previewMedia, setPreviewMedia] = useState<{ url: string; mimeType: string; name: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDirectory = async (folderId: string | null = currentFolderId) => {
    try {
      setLoading(true);
      const url = folderId ? `/files/explorer?folderId=${folderId}` : '/files/explorer';
      const data = await apiFetch<VfsExplorerResponse>(url);
      setBreadcrumbs(data.breadcrumbs || []);
      setFolders(data.folders || []);
      setFiles(data.files || []);
      setCurrentFolderId(data.currentFolder ? data.currentFolder.id : null);
    } catch (err: any) {
      alert(err.message || 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(null);
  }, []);

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName) return;

    try {
      await apiFetch('/files/folders', {
        method: 'POST',
        body: JSON.stringify({ name: folderName, parentId: currentFolderId }),
      });
      loadDirectory(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const formData = new FormData();
    for (let i = 0; i < e.target.files.length; i++) {
      formData.append('files', e.target.files[i]);
    }
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    try {
      setLoading(true);
      await apiFetch('/files/upload', {
        method: 'POST',
        body: formData,
      });
      loadDirectory(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (item: VfsItem) => {
    if (!confirm(`Delete ${item.name}?`)) return;

    try {
      const type = item.type === 'folder' ? 'folder' : 'file';
      await apiFetch(`/files/items?itemId=${item.id}&type=${type}`, { method: 'DELETE' });
      loadDirectory(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  const handleRename = async (item: VfsItem) => {
    const newName = prompt(`Rename ${item.name} to:`, item.name);
    if (!newName || newName === item.name) return;

    try {
      await apiFetch('/files/items/rename', {
        method: 'PATCH',
        body: JSON.stringify({
          itemId: item.id,
          type: item.type,
          newName,
        }),
      });
      loadDirectory(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Rename failed');
    }
  };

  const handlePaste = async () => {
    if (!clipboard) return;
    try {
      const endpoint = clipboard.action === 'copy' ? '/files/items/copy' : '/files/items/move';
      const method = clipboard.action === 'copy' ? 'POST' : 'PATCH';

      await apiFetch(endpoint, {
        method,
        body: JSON.stringify({
          itemId: clipboard.item.id,
          type: clipboard.item.type,
          targetFolderId: currentFolderId,
        }),
      });

      setClipboard(null);
      loadDirectory(currentFolderId);
    } catch (err: any) {
      alert(err.message || 'Paste operation failed');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        setClipboard({ item: selectedItem, action: 'copy' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        setClipboard({ item: selectedItem, action: 'cut' });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (clipboard) handlePaste();
      } else if (e.key === 'Delete') {
        handleDelete(selectedItem);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedItem, clipboard]);

  const getItemIcon = (item: VfsItem) => {
    if (item.type === 'folder') return '📁';
    if (item.mimeType?.startsWith('image/')) return '🖼️';
    if (item.mimeType?.startsWith('video/')) return '🎥';
    if (item.mimeType?.startsWith('audio/')) return '🎵';
    if (item.mimeType === 'application/pdf') return '📄';
    return '📦';
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ExplorerContainer onClick={() => setContextMenu(null)}>
      {/* Top Bar */}
      <TopBar>
        <BreadcrumbBar>
          <Button onClick={onBack} style={{ padding: '6px 10px', fontSize: '0.75rem' }}>
            &lt;- BACK
          </Button>
          <CrumbItem $active={currentFolderId === null} onClick={() => loadDirectory(null)}>
            HOME
          </CrumbItem>
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={`crumb-${crumb.id}`}>
              <CrumbSeparator>/</CrumbSeparator>
              <CrumbItem
                $active={crumb.id === currentFolderId}
                onClick={() => loadDirectory(crumb.id)}
              >
                {crumb.name}
              </CrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbBar>

        <ActionToolbar>
          <Button onClick={handleCreateFolder}>📁 NEW FOLDER</Button>

          <input
            type="file"
            ref={fileInputRef}
            multiple
            style={{ display: 'none' }}
            onChange={handleUploadFiles}
          />
          <Button $primary onClick={() => fileInputRef.current?.click()}>
            ⬆️ UPLOAD FILES
          </Button>
        </ActionToolbar>
      </TopBar>

      {/* Main Area */}
      <MainArea>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-faint)', fontFamily: 'var(--font-dot)' }}>
            LOADING VFS DIRECTORY...
          </div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-faint)', fontFamily: 'var(--font-dot)' }}>
            [ EMPTY DIRECTORY // UPLOAD OR CREATE A FOLDER ]
          </div>
        ) : (
          <GridContainer>
            {folders.map((folder) => (
              <ItemCard
                key={`folder-${folder.id}`}
                $isFolder
                $selected={selectedItem?.id === folder.id}
                onClick={() => setSelectedItem(folder)}
                onDoubleClick={() => loadDirectory(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedItem(folder);
                  setContextMenu({ x: e.clientX, y: e.clientY, item: folder });
                }}
              >
                <ItemIcon>{getItemIcon(folder)}</ItemIcon>
                <ItemName>{folder.name}</ItemName>
                <ItemMeta>FOLDER</ItemMeta>
              </ItemCard>
            ))}

            {files.map((file) => (
              <ItemCard
                key={`file-${file.id}`}
                $selected={selectedItem?.id === file.id}
                onClick={() => setSelectedItem(file)}
                onDoubleClick={() => {
                  setPreviewMedia({
                    url: `/api/files/${file.id}/preview`,
                    mimeType: file.mimeType || 'application/octet-stream',
                    name: file.name,
                  });
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setSelectedItem(file);
                  setContextMenu({ x: e.clientX, y: e.clientY, item: file });
                }}
              >
                <ItemIcon>{getItemIcon(file)}</ItemIcon>
                <ItemName>{file.name}</ItemName>
                <ItemMeta>{formatSize(file.size)}</ItemMeta>
              </ItemCard>
            ))}
          </GridContainer>
        )}
      </MainArea>

      {/* Context Menu */}
      {contextMenu && contextMenu.item && (
        <ContextMenuOverlay $x={contextMenu.x} $y={contextMenu.y}>
          {contextMenu.item.type === 'folder' ? (
            <ContextMenuItem onClick={() => loadDirectory(contextMenu.item!.id)}>
              📂 Open Folder
            </ContextMenuItem>
          ) : (
            <ContextMenuItem
              onClick={() => {
                setPreviewMedia({
                  url: `/api/files/${contextMenu.item!.id}/preview`,
                  mimeType: contextMenu.item!.mimeType || '',
                  name: contextMenu.item!.name,
                });
              }}
            >
              👁️ Preview Stream
            </ContextMenuItem>
          )}

          <ContextMenuItem
            onClick={() => {
              setClipboard({ item: contextMenu.item!, action: 'copy' });
              setContextMenu(null);
            }}
          >
            📋 Copy (Ctrl+C)
          </ContextMenuItem>

          <ContextMenuItem
            onClick={() => {
              setClipboard({ item: contextMenu.item!, action: 'cut' });
              setContextMenu(null);
            }}
          >
            ✂️ Cut (Ctrl+X)
          </ContextMenuItem>

          <ContextMenuItem onClick={() => handleRename(contextMenu.item!)}>
            ✏️ Rename
          </ContextMenuItem>

          <ContextMenuItem $danger onClick={() => handleDelete(contextMenu.item!)}>
            🗑️ Delete (Del)
          </ContextMenuItem>
        </ContextMenuOverlay>
      )}

      {/* Media Preview Modal Overlay */}
      {previewMedia && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px',
          }}
          onClick={() => setPreviewMedia(null)}
        >
          <div
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              backgroundColor: '#111113',
              border: '1px solid var(--line-2)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-dot)', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                PREVIEW: {previewMedia.name}
              </span>
              <Button onClick={() => setPreviewMedia(null)}>✕ CLOSE</Button>
            </div>

            {previewMedia.mimeType.startsWith('video/') ? (
              <video controls autoPlay src={previewMedia.url} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px' }} />
            ) : previewMedia.mimeType.startsWith('audio/') ? (
              <audio controls autoPlay src={previewMedia.url} style={{ width: '400px' }} />
            ) : previewMedia.mimeType.startsWith('image/') ? (
              <img src={previewMedia.url} alt={previewMedia.name} style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '8px', objectFit: 'contain' }} />
            ) : (
              <iframe src={previewMedia.url} title={previewMedia.name} style={{ width: '80vw', height: '75vh', border: 'none', borderRadius: '8px' }} />
            )}
          </div>
        </div>
      )}
    </ExplorerContainer>
  );
};
