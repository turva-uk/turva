import { useState, useEffect, useRef } from "react";
import {
  Box,
  Text,
  Group,
  Badge,
  Button,
  Menu,
  Modal,
  TextInput,
  Textarea,
  Table,
  ActionIcon,
  Stack,
  Divider,
} from "@mantine/core";
import { IconChevronDown, IconEdit, IconTrash } from "@tabler/icons-react";

interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder";
  children?: FileItem[];
  parentId?: string;
  // Repeating folder support (for typing consistency)
  isRepeating?: boolean;
  repeatingTemplateFileId?: string;
}

interface TemplateEditorProps {
  selectedFile: FileItem | null;
  onFileChange: (changes: FileChanges) => void;
  onFileContentsChange?: (contents: FileContent) => void;
  onPlaceholdersChange?: (placeholders: Placeholder[]) => void;
}

interface FileContent {
  [fileId: string]: string;
}

interface FileChanges {
  [fileId: string]: boolean;
}

interface Placeholder {
  id: string;
  title: string;
  description: string;
}

export const TemplateEditor = ({
  selectedFile,
  onFileChange,
  onFileContentsChange,
  onPlaceholdersChange,
}: TemplateEditorProps) => {
  const [fileContents, setFileContents] = useState<FileContent>({});
  const [fileChanges, setFileChanges] = useState<FileChanges>({});
  const [currentContent, setCurrentContent] = useState<string>("");
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaceholder, setEditingPlaceholder] =
    useState<Placeholder | null>(null);
  const [newPlaceholderTitle, setNewPlaceholderTitle] = useState("");
  const [newPlaceholderDescription, setNewPlaceholderDescription] =
    useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize main.md with default content
  useEffect(() => {
    setFileContents((prev) => ({
      ...prev,
      "main-md": "# Project Template\n\nWelcome to your new project template!",
    }));
  }, []);

  // Update current content when selected file changes
  useEffect(() => {
    if (selectedFile) {
      const content = fileContents[selectedFile.id] || "";
      setCurrentContent(content);
    } else {
      setCurrentContent("");
    }
  }, [selectedFile, fileContents]);

  // Notify parent when file contents or placeholders change
  useEffect(() => {
    onFileContentsChange?.(fileContents);
  }, [fileContents, onFileContentsChange]);
  useEffect(() => {
    onPlaceholdersChange?.(placeholders);
  }, [placeholders, onPlaceholdersChange]);

  const handleContentChange = (value: string) => {
    setCurrentContent(value);
    if (selectedFile) {
      setFileContents((prev) => ({ ...prev, [selectedFile.id]: value }));
      const initialContent =
        selectedFile.id === "main-md"
          ? "# Project Template\n\nWelcome to your new project template!"
          : "";
      const newChanges = {
        ...fileChanges,
        [selectedFile.id]: value !== initialContent,
      };
      setFileChanges(newChanges);
      onFileChange(newChanges);
    }
  };

  const isFileChanged = selectedFile
    ? fileChanges[selectedFile.id] || false
    : false;

  const renderHighlightedText = (text: string) => {
    const parts = text.split(/(@@[^@]*@@)/g);
    return parts.map((part, index) =>
      /@@[^@]*@@/.test(part) ? (
        <span
          key={index}
          style={{
            fontWeight: "bold",
            backgroundColor: "var(--mantine-color-yellow-light)",
          }}
        >
          {part}
        </span>
      ) : (
        <span key={index}>{part}</span>
      ),
    );
  };

  const handleCreatePlaceholder = () => {
    if (!newPlaceholderTitle.trim()) return;

    const newPlaceholder: Placeholder = {
      id: Date.now().toString(),
      title: newPlaceholderTitle.trim(),
      description: newPlaceholderDescription.trim(),
    };

    setPlaceholders((prev) => [...prev, newPlaceholder]);
    setNewPlaceholderTitle("");
    setNewPlaceholderDescription("");
  };

  const handleUpdatePlaceholder = () => {
    if (!editingPlaceholder || !newPlaceholderTitle.trim()) return;

    setPlaceholders((prev) =>
      prev.map((p) =>
        p.id === editingPlaceholder.id
          ? {
              ...p,
              title: newPlaceholderTitle.trim(),
              description: newPlaceholderDescription.trim(),
            }
          : p,
      ),
    );
    setEditingPlaceholder(null);
    setNewPlaceholderTitle("");
    setNewPlaceholderDescription("");
  };

  const handleEditPlaceholder = (placeholder: Placeholder) => {
    setEditingPlaceholder(placeholder);
    setNewPlaceholderTitle(placeholder.title);
    setNewPlaceholderDescription(placeholder.description);
  };

  const handleDeletePlaceholder = (id: string) => {
    setPlaceholders((prev) => prev.filter((p) => p.id !== id));
  };

  const handleInsertPlaceholder = (placeholder: Placeholder) => {
    if (!selectedFile || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholderText = `@@${placeholder.title}@@`;

    const newContent =
      currentContent.substring(0, start) +
      placeholderText +
      currentContent.substring(end);
    handleContentChange(newContent);

    // Set cursor position after the inserted placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + placeholderText.length,
        start + placeholderText.length,
      );
    }, 0);
  };

  const resetModal = () => {
    setEditingPlaceholder(null);
    setNewPlaceholderTitle("");
    setNewPlaceholderDescription("");
  };

  if (!selectedFile) {
    return (
      <Box
        p="md"
        style={{ textAlign: "center", color: "var(--mantine-color-dimmed)" }}
      >
        <Text>Select a file to start editing</Text>
      </Box>
    );
  }

  if (selectedFile.type === "folder") {
    return (
      <Box
        p="md"
        style={{ textAlign: "center", color: "var(--mantine-color-dimmed)" }}
      >
        <Text>Folders cannot be edited. Please select a file.</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Text fw={500}>Editing: {selectedFile.name}</Text>
          {isFileChanged && (
            <Badge size="sm" color="orange" variant="light">
              Modified
            </Badge>
          )}
        </Group>

        <Group gap="sm">
          <Menu>
            <Menu.Target>
              <Button
                size="xs"
                variant="outline"
                rightSection={<IconChevronDown size={12} />}
                disabled={placeholders.length === 0}
              >
                Insert placeholder
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              {placeholders.length === 0 ? (
                <Menu.Item disabled>No placeholders available</Menu.Item>
              ) : (
                placeholders.map((placeholder) => (
                  <Menu.Item
                    key={placeholder.id}
                    onClick={() => handleInsertPlaceholder(placeholder)}
                  >
                    <Box>
                      <Text size="sm" fw={500}>
                        {placeholder.title}
                      </Text>
                      {placeholder.description && (
                        <Text size="xs" c="dimmed">
                          {placeholder.description}
                        </Text>
                      )}
                    </Box>
                  </Menu.Item>
                ))
              )}
            </Menu.Dropdown>
          </Menu>

          <Button
            size="xs"
            variant="outline"
            onClick={() => setIsModalOpen(true)}
          >
            Manage placeholders
          </Button>
        </Group>
      </Group>

      <Box
        style={{
          position: "relative",
          border: "1px solid var(--mantine-color-gray-4)",
          borderRadius: "4px",
          minHeight: "400px",
        }}
      >
        {/* Hidden textarea for input */}
        <textarea
          ref={textareaRef}
          value={currentContent}
          onChange={(event) => handleContentChange(event.currentTarget.value)}
          placeholder="Start typing your content here..."
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            padding: "8px 12px",
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.5",
            color: "transparent",
            caretColor: "var(--mantine-color-dark-9)",
            resize: "none",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
          }}
        />

        {/* Highlighted text overlay */}
        <Box
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            padding: "8px 12px",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.5",
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {currentContent ? (
            renderHighlightedText(currentContent)
          ) : (
            <Text
              c="dimmed"
              style={{ fontFamily: "monospace", fontSize: "14px" }}
            >
              Start typing your content here...
            </Text>
          )}
        </Box>
      </Box>

      {/* Manage Placeholders Modal */}
      <Modal
        opened={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetModal();
        }}
        title="Manage Placeholders"
        size="lg"
      >
        <Stack gap="md">
          {/* Add/Edit Form */}
          <Box>
            <Text fw={500} mb="sm">
              {editingPlaceholder ? "Edit Placeholder" : "Add New Placeholder"}
            </Text>
            <Stack gap="sm">
              <TextInput
                label="Title"
                placeholder="e.g., Company Name"
                value={newPlaceholderTitle}
                onChange={(e) => setNewPlaceholderTitle(e.currentTarget.value)}
              />
              <Textarea
                label="Description"
                placeholder="e.g., This is the full legal name of your company or entity"
                value={newPlaceholderDescription}
                onChange={(e) =>
                  setNewPlaceholderDescription(e.currentTarget.value)
                }
                rows={3}
              />
              <Group gap="sm">
                <Button
                  onClick={
                    editingPlaceholder
                      ? handleUpdatePlaceholder
                      : handleCreatePlaceholder
                  }
                  disabled={!newPlaceholderTitle.trim()}
                >
                  {editingPlaceholder ? "Update" : "Add"} Placeholder
                </Button>
                {editingPlaceholder && (
                  <Button variant="outline" onClick={resetModal}>
                    Cancel
                  </Button>
                )}
              </Group>
            </Stack>
          </Box>

          <Divider />

          {/* Placeholders List */}
          <Box>
            <Text fw={500} mb="sm">
              Existing Placeholders
            </Text>
            {placeholders.length === 0 ? (
              <Text c="dimmed" size="sm">
                No placeholders created yet.
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Title</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th w={100}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {placeholders.map((placeholder) => (
                    <Table.Tr key={placeholder.id}>
                      <Table.Td>
                        <Text fw={500}>{placeholder.title}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {placeholder.description || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            onClick={() => handleEditPlaceholder(placeholder)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() =>
                              handleDeletePlaceholder(placeholder.id)
                            }
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Box>
        </Stack>
      </Modal>
    </Box>
  );
};
