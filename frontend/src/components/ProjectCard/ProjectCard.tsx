import { Box, Button, Card, Image, Stack, Text, Title } from "@mantine/core"

interface ProjectCardProps {
  imageUrl?: string;
  title?: string;
  description?: string;
  lastUpdated?: Date;
  createdBy?: string;
  organisation?: string;
}

const ProjectCard = ({ imageUrl, title, description, lastUpdated, createdBy, organisation }: ProjectCardProps) => {
  return (
    <Card withBorder shadow="md" m="md" p="xl" radius="md">
      <Stack gap="xs">
        <Card.Section>
          <Image src={imageUrl} alt="Project Logo" />
        </Card.Section>
        <Card.Section>
          <Title order={5}>{title}</Title>
          <Text size="sm" c="dimmed">
            {description}
          </Text>
        </Card.Section>
        <Card.Section>
          <Box>
            <Text size="xs" c="dimmed">Last updated: {lastUpdated?.toLocaleDateString()}</Text>
            <Text size="xs" c="dimmed">Created by: {createdBy}</Text>
            {organisation && <Text size="xs" c="dimmed">{organisation}</Text>}
          </Box>
        </Card.Section>
        <Card.Section>
          <Button fullWidth variant="light" color="blue">
            View Project
          </Button>
        </Card.Section>
      </Stack>
    </Card>
  )
}

export default ProjectCard