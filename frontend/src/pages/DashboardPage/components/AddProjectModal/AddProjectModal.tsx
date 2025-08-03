import { Button, Group, Modal, Select, Stack, Textarea, TextInput } from "@mantine/core";

interface AddProjectModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddProjectModal = ({ opened, onClose, onSuccess }: AddProjectModalProps) => {
  return (
    <Modal title="Add Project" opened={opened} onClose={onClose} size="md">
      <Stack gap="sm">
        <TextInput
          label="Project name"
          placeholder="Enter project name"
          required
          withAsterisk
        />

        <Select label="Organisation"
          placeholder="Select organisation"
          data={[
            { value: 'org1', label: 'Organisation 1' },
            { value: 'org2', label: 'Organisation 2' },
          ]}
          required
          withAsterisk
        />

        <Textarea
          label="Description"
          placeholder="Enter project description"
        />

        <TextInput
          label="Internal reference"
          placeholder="Enter internal project reference"
        />

        <Group justify="end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={onSuccess}>Create</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

export default AddProjectModal;