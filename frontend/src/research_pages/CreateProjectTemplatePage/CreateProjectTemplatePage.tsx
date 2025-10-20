import { Box, Container, Grid, Space, Button, Group, Text } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { useState, useEffect } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { HeaderTabs } from './components/HeaderTabs/HeaderTabs';
import { FileManager } from './components/FileManager/FileManager';
import { TemplateEditor } from './components/TemplateEditor/TemplateEditor';
import useREST from '../../hooks/useREST';

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

interface FileChanges {
  [fileId: string]: boolean;
}

const CreateProjectTemplatePage = () => {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChanges>({});
  const [fileContents, setFileContents] = useState<{[fileId: string]: string}>({});
  const [files, setFiles] = useState<FileItem[]>([]);
  const [placeholders, setPlaceholders] = useState<any[]>([]);

  // Align with hook definition (resource excludes /api prefix)
  const { success, loading, submitFn, resetData } = useREST<any, any>('POST', '/project-templates');

  const hasChanges = Object.values(fileChanges).some((changed) => changed);

  const handleSave = () => {
    const templateData = {
      files,
      fileContents,
      placeholders,
      metadata: {
        name: 'Project Template',
      },
    };
    submitFn(templateData);
  };

  useEffect(() => {
    if (success) {
      setFileChanges({});
      resetData();
    }
  }, [success, resetData]);

  return (
    <Box>
      <HeaderTabs />
      <Space h="sm" />
      <Container size="xl">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={500}>Project Template Editor</Text>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={loading}
            disabled={!hasChanges}
            variant={hasChanges ? 'filled' : 'light'}
          >
            {hasChanges ? 'Save Changes' : 'Saved'}
          </Button>
        </Group>

        <Grid columns={4}>
          <Grid.Col span={1}>
            <FileManager
              onFileSelect={setSelectedFile}
              fileChanges={fileChanges}
              onFilesChange={setFiles}
            />
          </Grid.Col>
          <Grid.Col span={3}>
            <TemplateEditor
              selectedFile={selectedFile}
              onFileChange={setFileChanges}
              onFileContentsChange={setFileContents}
              onPlaceholdersChange={setPlaceholders}
            />
          </Grid.Col>
        </Grid>
      </Container>
    </Box>
  );
}

export default CreateProjectTemplatePage;