import { Anchor, Button, Group, Paper, RingProgress, SimpleGrid, Table, Text } from "@mantine/core";
import { useState } from "react";
import AddProjectModal from "./components/AddProjectModal/AddProjectModal";

const DashboardPage = () => {
   const [showAddProjectModal, setShowAddProjectModal] = useState(false);
   return (
      <div>
         <SimpleGrid cols={{ base: 1, sm: 3 }}>
            <Paper withBorder radius="md" p="xs">
               <Group>
                  <RingProgress
                     size={80}
                     roundCaps
                     thickness={8}
                     sections={[{ value: 70, color: 'violet.7' }]}
                  />

                  <div>
                     <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                        Projects awaiting CSO review
                     </Text>
                     <Text fw={700} size="xl">
                        3
                     </Text>
                  </div>
               </Group>
            </Paper>
         </SimpleGrid>

         <Button mt="md" onClick={() => setShowAddProjectModal(true)}>Add project</Button>

         <Table mt="md">
            <Table.Tbody>
               <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Assigned CSO</Table.Th>
                  <Table.Th>Last updated</Table.Th>
                  <Table.Th>Author</Table.Th>
                  <Table.Th>Organisation</Table.Th>
                  <Table.Th>Tags</Table.Th>
                  <Table.Th>Actions</Table.Th>
               </Table.Tr>
               <Table.Tr>
                  <Table.Td>Project 1</Table.Td>
                  <Table.Td>Project description</Table.Td>
                  <Table.Td>John CSO</Table.Td>
                  <Table.Td>2023-10-01</Table.Td>
                  <Table.Td>Author Name</Table.Td>
                  <Table.Td>Organisation Name</Table.Td>
                  <Table.Td><Anchor size="sm">Needs CSO review</Anchor></Table.Td>
                  <Table.Td><Anchor size="sm">Open</Anchor></Table.Td>
               </Table.Tr>
               <Table.Tr>
                  <Table.Td>Project 2</Table.Td>
                  <Table.Td>Project description</Table.Td>
                  <Table.Td>-</Table.Td>
                  <Table.Td>2023-10-01</Table.Td>
                  <Table.Td>Author Name</Table.Td>
                  <Table.Td>Organisation Name</Table.Td>
                  <Table.Td>
                     <Anchor size="sm">Needs CSO assigned</Anchor>
                     {', '}
                     <Anchor size="sm">Needs CSO review</Anchor>
                  </Table.Td>
                  <Table.Td><Anchor size="sm">Open</Anchor></Table.Td>
               </Table.Tr>
            </Table.Tbody>
         </Table>

         <AddProjectModal
            opened={showAddProjectModal}
            onClose={() => setShowAddProjectModal(false)}
            onSuccess={() => {
               setShowAddProjectModal(false);
               // Handle success logic here, ex. refresh projects list
            }}
         />
      </div>
   )
}
export default DashboardPage;