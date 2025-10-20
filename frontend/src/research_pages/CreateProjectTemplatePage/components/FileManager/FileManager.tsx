import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Group,
  Text,
  ActionIcon,
  Menu,
  ScrollArea,
  Stack,
  Badge
} from '@mantine/core';
import {
  IconFolder,
  IconFile,
  IconPlus,
  IconTrash,
  IconChevronRight,
  IconChevronDown
} from '@tabler/icons-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
  parentId?: string;
  // Repeating folder support
  isRepeating?: boolean;
  repeatingTemplateFileId?: string;
}

interface FileManagerProps {
  onFileSelect?: (file: FileItem) => void;
  fileChanges?: { [fileId: string]: boolean };
  onFilesChange?: (files: FileItem[]) => void;
}

export const FileManager = ({ onFileSelect, fileChanges = {}, onFilesChange }: FileManagerProps) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Initialize with main.md file
  useEffect(() => {
    const mainFile: FileItem = {
      id: 'main-md',
      name: 'main.md',
      type: 'file',
    };
    setFiles([mainFile]);
    setSelectedId('main-md');
    onFileSelect?.(mainFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent component when files change
  useEffect(() => {
    onFilesChange?.(files);
  }, [files, onFilesChange]);

  const findItemById = (items: FileItem[], id: string): FileItem | undefined => {
    for (const item of items) {
      if (item.id === id) return item;
      if (item.children) {
        const found = findItemById(item.children, id);
        if (found) return found;
      }
    }
    return undefined;
  };

  const checkNameExists = (name: string, parentId?: string): boolean => {
    if (parentId) {
      // Check within a specific folder
      const findInTree = (items: FileItem[]): boolean => {
        for (const item of items) {
          if (item.id === parentId && item.children) {
            return item.children.some(child => child.name === name);
          }
          if (item.children && findInTree(item.children)) {
            return true;
          }
        }
        return false;
      };
      return findInTree(files);
    } else {
      // Check in root directory
      return files.some(item => item.name === name);
    }
  };

  const isValidFileName = (name: string): boolean => {
    // Allow alphanumeric characters, hyphens, underscores, and dots
    const validNameRegex = /^[a-zA-Z0-9._-]+$/;
    return validNameRegex.test(name);
  };

  const updateFileTree = (items: FileItem[], parentId: string, newItem: FileItem): FileItem[] => {
    return items.map(item => {
      if (item.id === parentId && item.type === 'folder') {
        // If repeating and adding first file, record template file id
        const nextChildren = [...(item.children || []), newItem];
        const next: FileItem = {
          ...item,
          children: nextChildren,
          ...(item.isRepeating && newItem.type === 'file' && !item.repeatingTemplateFileId
            ? { repeatingTemplateFileId: newItem.id }
            : {})
        };
        return next;
      }
      if (item.children) {
        return {
          ...item,
          children: updateFileTree(item.children, parentId, newItem)
        };
      }
      return item;
    });
  };

  const createItem = (type: 'file' | 'folder', parentId?: string, isRepeatingFolder: boolean = false) => {
    const name = prompt(`Enter ${isRepeatingFolder ? 'repeated folder' : type} name:`);
    if (!name) return;

    // Validate name format
    if (!isValidFileName(name)) {
      alert(`Invalid ${type} name. Only letters, numbers, dots, hyphens, and underscores are allowed.`);
      return;
    }

    // Check if name already exists in the same directory
    if (checkNameExists(name, parentId)) {
      alert(`A ${type} with the name "${name}" already exists in this location.`);
      return;
    }

    // Enforce repeating folder constraints (parent cannot be repeating for new folders; only one file allowed)
    if (parentId) {
      const parent = findItemById(files, parentId);
      if (parent && parent.type === 'folder' && parent.isRepeating) {
        if (type === 'folder') {
          alert('A repeating folder cannot contain sub-folders.');
          return;
        }
        const fileCount = (parent.children || []).filter(c => c.type === 'file').length;
        if (fileCount >= 1) {
          alert('A repeating folder can only contain a single file (the template).');
          return;
        }
      }
    }

    const newItem: FileItem = {
      id: Date.now().toString(),
      name,
      type,
      children: type === 'folder' ? [] : undefined,
      parentId,
      ...(type === 'folder' && isRepeatingFolder ? { isRepeating: true } : {})
    };

    if (parentId) {
      setFiles(prev => updateFileTree(prev, parentId, newItem));
    } else {
      setFiles(prev => [...prev, newItem]);
    }
  };

  const deleteItem = (id: string) => {
    // Prevent deletion of main.md
    if (id === 'main-md') return;
    
    setFiles(prev => removeFromTree(prev, id));
    if (selectedId === id) {
      setSelectedId(null);
    }
  };

  const removeFromTree = (items: FileItem[], id: string): FileItem[] => {
    return items
      .filter(item => item.id !== id)
      .map(item => {
        const children = item.children ? removeFromTree(item.children, id) : undefined;
        const next: FileItem = { ...item, children };
        // If a repeating folder pointed to this file as template, clear it
        if (item.type === 'folder' && item.repeatingTemplateFileId === id) {
          delete next.repeatingTemplateFileId;
        }
        return next;
      });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectItem = (item: FileItem) => {
    setSelectedId(item.id);
    onFileSelect?.(item);
  };

  const renderFileTree = (items: FileItem[], depth = 0) => {
    return items.map(item => (
      <Box key={item.id} pl={depth * 16}>
        <Group
          gap="xs"
          p="xs"
          style={{
            backgroundColor: selectedId === item.id ? 'var(--mantine-color-blue-light)' : 'transparent',
            borderRadius: 4,
            cursor: 'pointer'
          }}
          onClick={() => selectItem(item)}
        >
          {item.type === 'folder' && (
            <ActionIcon
              variant="transparent"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(item.id);
              }}
            >
              {expandedFolders.has(item.id) ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            </ActionIcon>
          )}
          {item.type === 'file' && <Box w={24} />}
          
          {item.type === 'folder' ? <IconFolder size={16} /> : <IconFile size={16} />}
          
          <Group gap="xs" flex={1}>
            <Text size="sm">{item.name}</Text>
            {item.type === 'folder' && item.isRepeating && (
              <Badge size="xs" color="grape" variant="light">Repeating</Badge>
            )}
            {item.type === 'file' && fileChanges[item.id] && (
              <Badge size="xs" color="orange" variant="filled" style={{ minWidth: 'auto', padding: '2px 4px' }}>
                •
              </Badge>
            )}
          </Group>
          
          {/* Only show action menu if not main.md */}
          {item.id !== 'main-md' && (
            <>
              {item.type === 'folder' ? (
                <Menu position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="transparent"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      onClick={() => createItem('file', item.id)}
                      disabled={item.isRepeating && (item.children || []).some(c => c.type === 'file')}
                    >
                      New File
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => createItem('folder', item.id)}
                      disabled={item.isRepeating}
                    >
                      New Folder
                    </Menu.Item>
                    <Menu.Item
                      onClick={() => createItem('folder', item.id, true)}
                      disabled={item.isRepeating}
                    >
                      Create Repeated Folder
                    </Menu.Item>
                    <Menu.Item
                      color="red"
                      onClick={() => deleteItem(item.id)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              ) : (
                <ActionIcon
                  variant="transparent"
                  size="sm"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              )}
            </>
          )}
        </Group>
        
        {item.type === 'folder' && expandedFolders.has(item.id) && item.children && (
          renderFileTree(item.children, depth + 1)
        )}
      </Box>
    ));
  };

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Text fw={500}>Files</Text>
        <Menu position="bottom-end">
          <Menu.Target>
            <Button variant="light" size="xs" leftSection={<IconPlus size={14} />}>
              New
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => createItem('file')}>
              New File
            </Menu.Item>
            <Menu.Item onClick={() => createItem('folder')}>
              New Folder
            </Menu.Item>
            <Menu.Item onClick={() => createItem('folder', undefined, true)}>
              Create Repeated Folder
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
      
      <ScrollArea h={400}>
        <Stack gap="xs">
          {renderFileTree(files)}
        </Stack>
      </ScrollArea>
    </Box>
  );
};
