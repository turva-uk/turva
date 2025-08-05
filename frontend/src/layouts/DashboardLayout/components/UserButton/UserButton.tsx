import { Group, UnstyledButton, Text, rem, Avatar } from "@mantine/core"
import { IconChevronRight } from '@tabler/icons-react';
import classes from './UserButton.module.css';
import { forwardRef, useContext } from "react";
import type { ComponentPropsWithoutRef } from "react";
import type User from "../../../../types/User";
import { UserAuthContext } from "../../../../app/contexts/UserAuthContext";

const UserInitials = ({user}: {user: User}) => {
  let initials = user.firstName[0].toUpperCase();
  if (user.lastName) {
    initials += user.lastName[0].toUpperCase();
  }

  return initials;
}

const UserButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<'button'>>(({ ...args}: ComponentPropsWithoutRef<'button'>, ref) => {
  const { user } = useContext(UserAuthContext);

  return (
    <UnstyledButton ref={ref} {...args} className={classes.user} c="white" pt="md" px="sm">
      <Group>
        { user && (
          <Avatar radius="xl" variant="filled" color='turva.9'>
            <UserInitials user={user} />
          </Avatar>
        )}
        <div style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            {user ? `${user.firstName} ${user.lastName}` : 'Not logged in'}
          </Text>
          { 
          user && (
            <Text c="gray.4" size="xs">
              {user.emailAddress}
            </Text>
          ) }
        </div>
        <IconChevronRight style={{ width: rem(14), height: rem(14) }} stroke={1.5} />
      </Group>
    </UnstyledButton>
  )
})

export default UserButton;