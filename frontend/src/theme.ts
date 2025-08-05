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
    ],
    turva: [
      '#f3f2ff',
      '#e3e2f0',
      '#c5c3d9',
      '#a5a2c2',
      '#8a86ae',
      '#7974a2',
      '#716c9e',
      '#5f5a8a',
      '#54507c',
      '#474470'
    ]
  },
  primaryColor: 'turva',
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