import { Container, Title, Button, Group, rem } from "@mantine/core";
import { useNavigate } from "react-router";

const ResourceNotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", textAlign: "center" }}>
        <Title
          style={{
            fontWeight: 900,
            fontSize: rem(150),
            lineHeight: 1,
            marginBottom: "1rem",
          }}
        >
          404
        </Title>
        <Title
          style={{
            fontFamily: "Greycliff CF, var(--mantine-font-family)",
            fontSize: rem(30),
            fontWeight: 700,
            marginBottom: "2rem",
          }}
        >
          The page or resource you're looking for can't be found
        </Title>

        <Group justify="center">
          <Button size="sm" onClick={() => navigate("/")}>
            To the home page
          </Button>
        </Group>
      </div>
    </Container>
  );
};

export default ResourceNotFoundPage;
