import ErrorDisplay from './ErrorDisplay';
import { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Components/Error display',
  component: ErrorDisplay,
} as Meta<typeof ErrorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithErrorString: Story = {
  render: () => {
    return (
      <ErrorDisplay title="Error logging in" error={"This is an error"} />
    );
  },
}

export const WithNoErrorPassed: Story = {
  render: () => {
    return (
      <ErrorDisplay title="Error logging in" error={null} />
    );
  },
}

export const WithHttpError: Story = {
  render: () => {
    return (
      <ErrorDisplay title="Error logging in" error={{
        detail: "This is an error",
        statusCode: "404"
      }} />
    );
  },
}

export const WithComplexErrorDetail: Story = {
  render: () => {
    return (
      <ErrorDisplay title="Error logging in" error={{
        detail: {'error': 'This is an error in a JSON string!'},
        statusCode: "400"
      }} />
    );
  },
}