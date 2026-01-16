import { createContext, useMemo, useRef, useState } from "react";
import type Group from "../../types/Group";
import type { PropsWithChildren, ReactNode } from "react";
import { withFetch } from "../../common/withFetch";
import type { RESTError } from "../../common/restUtils";
import { notifications } from "@mantine/notifications";

export interface UserGroupsInterface {
  groups?: Group[];
  groupsLoading: boolean;
  groupsError: RESTError | null;
  updateGroups: (forceUpdate?: boolean) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const UserGroupsContext = createContext<UserGroupsInterface>({
  groups: undefined,
  updateGroups: () => {},
  groupsError: null,
  groupsLoading: false,
});

export const UserGroupsProvider = ({
  children,
}: PropsWithChildren): ReactNode => {
  const [userGroups, setUserGroups] = useState<Group[] | undefined>();
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);
  const [groupsError, setGroupsError] = useState<RESTError | null>(null);
  const lastFetch = useRef<Date | null>(null);
  const fetchDelay = 1; // seconds

  const updateGroups = async (forceUpdate: boolean = false) => {
    if (
      !forceUpdate &&
      lastFetch.current &&
      Date.now() - lastFetch.current.getTime() < fetchDelay * 1000
    ) {
      return;
    }
    lastFetch.current = new Date();

    setLoadingGroups(true);
    const groupsApi = await withFetch<null, Group[]>({
      method: "GET",
      resource: "/group/",
      redirectOnAuthFail: true,
    });
    setLoadingGroups(false);

    if (groupsApi.error) {
      console.error("Error fetching groups:", groupsApi.error);
      notifications.show({
        title: "Error getting groups",
        message:
          "There was an error getting your groups. Please try again later.",
        color: "red",
      });
      setGroupsError(groupsApi.error);
      return;
    }

    if (groupsApi.data) {
      setUserGroups(groupsApi.data);
    }
  };

  return (
    <UserGroupsContext.Provider
      value={useMemo(
        () => ({
          groups: userGroups,
          updateGroups,
          groupsError: groupsError,
          groupsLoading: loadingGroups,
        }),
        [userGroups, groupsError, loadingGroups],
      )}
    >
      {children}
    </UserGroupsContext.Provider>
  );
};
