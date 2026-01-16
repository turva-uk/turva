import ProjectCard from "#src/components/ProjectCard/ProjectCard.tsx";
import { Box, Divider, Grid, Select, TextInput } from "@mantine/core";

const CommunityProjectsPage = () => {
  return (
    <Box>
      <Grid>
        <Grid.Col span={3}>
          <TextInput
            mb="md"
            label="Search projects"
            placeholder="Search by name or description"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <Select
            label="Filter by organisation"
            placeholder="Select organisation"
            mb="md"
            data={["Org 1", "Org 2", "Org 3"]}
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <Select
            label="Sort by"
            placeholder="Select sorting method"
            mb="md"
            data={["Last updated", "Name", "Created by"]}
          />
        </Grid.Col>
      </Grid>

      <Divider />
      <Grid>
        <Grid.Col span={3}>
          <ProjectCard
            imageUrl="https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg"
            title="DCB0129 Generic"
            description="Clinical Risk Management: its Application in the Manufacture of Health IT Systems"
            lastUpdated={new Date("2025-10-24")}
            createdBy="John Doe"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <ProjectCard
            imageUrl="https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg"
            title="DCB0160 Generic"
            description="Clinical Risk Management: its Application in the Deployment and Use of Health IT Systems"
            lastUpdated={new Date("2025-10-24")}
            createdBy="John Doe"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <ProjectCard
            imageUrl="https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg"
            title="NHS DTAC Generic"
            description="Clinical Risk Management: its Application in the Manufacture of Health IT Systems"
            lastUpdated={new Date("2025-10-24")}
            createdBy="John Doe"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <ProjectCard
            imageUrl="https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg"
            title="AttendAnywhere"
            description="Clinical Risk Management: its Application in the Manufacture of Health IT Systems"
            lastUpdated={new Date("2025-10-24")}
            createdBy="John Doe"
          />
        </Grid.Col>
        <Grid.Col span={3}>
          <ProjectCard
            imageUrl="https://peopleshistorynhs.org/wp-content/uploads/2016/01/nhs-logo-880x4951.jpeg"
            title="Eureka IPC"
            description="Eureka IPC is an..."
            lastUpdated={new Date("2025-10-24")}
            createdBy="John Doe"
            organisation="Oxford University Hospitals"
          />
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default CommunityProjectsPage;
