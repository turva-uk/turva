import { createTheme } from '@mantine/core';

export const theme = createTheme({
  colors: {
    dark: [
      '#dfdfdf',
      '#ff0000',
      '#d0d0d0',
      '#aaaaaa',
      '#222222',
      '#181A1B',
      '#141414',
      '#121212',
      '#181A1B',
      '#181A1B'
    ]
  },
  primaryColor: 'violet',
  components: {
    Button: {
      defaultProps: {
        radius: 0,
      }
    },
    TextInput: {
      defaultProps: {
        radius: 0
      }
    },
    Select: {
      defaultProps: {
        radius: 0
      }
    },
    MultiSelect: {
      defaultProps: {
        radius: 0
      }
    },
    Textarea: {
      defaultProps: {
        radius: 0
      }
    },
    Card: {
      defaultProps: {
        radius: 0
      }
    },
    PasswordInput: {
      defaultProps: {
        radius: 0
      }
    },
  },
});