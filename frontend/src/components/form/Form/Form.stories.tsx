/**
 * Form Storybook Stories
 *
 * Demonstrates the full Form wrapper with FormStatus and SubmitButton
 * working together via context.
 */

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stack } from "@mantine/core";
import { StoryNote } from "@/stories/variants";
import { Form, FormStatus, SubmitButton, useFormContext } from "./index";
import type { FormSubmitResult } from "./Form";
import TextField from "../TextField";
import TextAreaField from "../TextAreaField";
import PasswordField from "../PasswordField";
import SelectField from "../SelectField";
import MultiSelectField from "../MultiSelectField";
import SolidSwitch from "../SolidSwitch";
import RadioField from "../RadioField";

import { IconAlertTriangle } from "@/components/icons/appIcons";
import { useState } from "react";
import type { ReactNode } from "react";

/** Flash payload shape (matches location.state.flash consumed by PageMessageProvider) */
interface FlashPayload {
  variant?: "success" | "partial_success" | "error";
  title: string;
  description?: ReactNode;
}

const meta: Meta<typeof Form> = {
  title: "Form/Form",
  component: Form,
  parameters: {
    layout: "padded",
  },
};

export default meta;
type Story = StoryObj<typeof Form>;

interface DemoFormValues {
  name: string;
  isStaff: boolean;
  role: string;
}

interface HazardDraftValues {
  title: string;
  owner: string;
  reviewDate: string;
  evidence: string;
}

interface PermissionFormValues {
  user: string;
  level: string;
}

interface StaffRemovalFormValues {
  username: string;
}

interface PlaygroundFormValues {
  name: string;
  password: string;
  notes: string;
  isStaff: boolean;
  role: string;
  priority: string;
  tags: string[];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Renders a flash message directly via FormStatus */
function InjectFlash({ flash }: { flash: FlashPayload | null }) {
  if (!flash) {
    return null;
  }
  return (
    <FormStatus
      variant={flash.variant ?? "success"}
      title={flash.title}
      description={flash.description}
    />
  );
}

/**
 * Success - form submits and shows a success status card
 */
export const SuccessSubmission: Story = {
  render: function SuccessStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1000);
      return {
        state: "success",
        message: {
          title: "Settings saved",
          description: "Your changes have been applied.",
        },
      };
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{ name: "Dr Smith", isStaff: false, role: "clinician" }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit</StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Error - form submits and shows an error status card
 */
export const ErrorSubmission: Story = {
  render: function ErrorStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1000);
      return {
        state: "error",
        message: {
          title: "Failed to save",
          description: "The server returned an error.",
        },
      };
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{ name: "Dr Smith", isStaff: false, role: "clinician" }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit</StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Unexpected error - handler throws instead of returning a result.
 * Form catches it and shows the generic fallback message.
 */
export const UnexpectedError: Story = {
  render: function UnexpectedErrorStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1000);
      throw new Error("Network failure");
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{ name: "Dr Smith", isStaff: false, role: "clinician" }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit</StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Partial success - composite write with mixed outcomes
 */
export const PartialSuccessSubmission: Story = {
  render: function PartialStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1000);
      return {
        state: "partial_success",
        message: {
          title: "Partially saved",
          description: "Hazard saved. The notification could not be sent.",
        },
      };
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{ name: "Dr Smith", isStaff: false, role: "clinician" }}
        onSubmit={handleSubmit}
        submitLabel="Send"
        submittingLabel="Sending…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit</StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Timeout - form submission exceeds timeout
 */
export const TimeoutSubmission: Story = {
  render: function TimeoutStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      // Deliberately ignores cancellation: the UI timeout cannot stop this work.
      await delay(60_000);
      return {
        state: "success",
        message: { title: "Saved" },
      };
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{ name: "Dr Smith", isStaff: false, role: "clinician" }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
        timeoutMs={2000}
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit</StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Validation error - press submit with an invalid email to see the warning card
 * and inline field errors. Uses RHF validation so the onInvalid handler
 * triggers the validation_error state with amber styling.
 */
export const ValidationError: Story = {
  render: function ValidationErrorStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(500);
      return {
        state: "success",
        message: { title: "Saved" },
      };
    };

    return (
      <Form<DemoFormValues>
        defaultValues={{
          name: "not-an-email",
          isStaff: false,
          role: "clinician",
        }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>Change a value, then press submit to see the validation warning</StoryNote>
          <FormStatus />
          <ValidatedEmail />
          <RegisteredStaff />
          <RegisteredRole />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * Dirty state playground - every atomic form field with disableWhenClean.
 * Toggle each field to verify the Save button enables/disables correctly.
 */
export const DirtyStatePlayground: Story = {
  render: function DirtyStateStory() {
    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1000);
      return {
        state: "success",
        message: {
          title: "Saved",
          description: "Your changes have been applied.",
        },
      };
    };

    return (
      <Form<PlaygroundFormValues>
        defaultValues={{
          name: "Dr Smith",
          password: "",
          notes: "",
          isStaff: false,
          role: "clinician",
          priority: "normal",
          tags: [],
        }}
        onSubmit={handleSubmit}
        submitLabel="Save"
        submittingLabel="Saving…"
        disableWhenClean
      >
        <Stack gap="md">
          <StoryNote>
            Change any field - Save should enable. Revert all - Save should disable.
          </StoryNote>
          <FormStatus />
          <RegisteredName />
          <RegisteredPassword />
          <RegisteredNotes />
          <RegisteredStaff />
          <RegisteredRole />
          <RegisteredPriority />
          <RegisteredTags />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/* RHF-registered field wrappers for the stories */

/**
 * Pattern 2 - Form with confirm prop, stays on page.
 * Validation passes → confirm modal opens → user confirms → onSubmit fires.
 * Success is shown via FormStatus on the same page.
 */
export const ConfirmAndStay: Story = {
  render: function ConfirmAndStayStory() {
    const permissionLabels: Record<string, string> = {
      admin: "Admin",
      staff: "Staff",
      clinician: "Clinician",
      superadmin: "Superadmin",
    };

    const handleSubmit = async (data: PermissionFormValues): Promise<FormSubmitResult> => {
      await delay(1500);
      return {
        state: "success",
        message: {
          title: "Permission deleted",
          description: (
            <>
              <strong>{permissionLabels[data.level] || data.level}</strong> permission for{" "}
              <strong>{data.user}</strong> has been removed.
            </>
          ),
        },
      };
    };

    return (
      <Form<PermissionFormValues>
        defaultValues={{ user: "Dr Smith", level: "admin" }}
        onSubmit={handleSubmit}
        submitLabel="Delete permissions"
        submittingLabel="Deleting…"
        confirm={{
          title: "Delete system permissions",
          children:
            "This will permanently delete the selected permissions. This action cannot be undone.",
          acceptLabel: "Delete",
          submittingLabel: "Deleting…",
          icon: <IconAlertTriangle />,
        }}
      >
        <Stack gap="md">
          <StoryNote>
            Press "Delete permissions". A confirmation modal will appear. Confirming stays on
            this page with a success message.
          </StoryNote>
          <FormStatus />
          <RegisteredUser />
          <RegisteredPermissionLevel />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * §4 Form with confirm prop + navigate - destructive action confirmed
 * via modal, then navigates to a destination page with a flash message.
 */
export const ConfirmThenNavigate: Story = {
  render: function ConfirmThenNavigateStory() {
    const [page, setPage] = useState<"form" | "destination">("form");
    const [flash, setFlash] = useState<FlashPayload | null>(null);

    if (page === "destination") {
      return (
        <Stack gap="md">
          <InjectFlash flash={flash} />
          <StoryNote>Staff members list (destination page)</StoryNote>
          <StoryNote>
            The flash message above was passed via React Router navigation state and rendered by
            the centralised PageMessage system.
          </StoryNote>
        </Stack>
      );
    }

    const handleSubmit = async (data: StaffRemovalFormValues): Promise<FormSubmitResult> => {
      await delay(1500);
      setFlash({
        title: "Staff member removed",
        description: `${data.username} has been removed from the organisation.`,
      });
      return { state: "success", message: { title: "" } };
    };

    return (
      <Form<StaffRemovalFormValues>
        defaultValues={{ username: "Dr Smith" }}
        onSubmit={handleSubmit}
        onSuccess={() => setPage("destination")}
        submitLabel="Remove staff member"
        submittingLabel="Removing…"
        confirm={{
          title: "Remove staff member",
          children:
            "Are you sure you want to remove this member from the organisation? This action cannot be undone.",
          acceptLabel: "Remove",
          submittingLabel: "Removing…",
          icon: <IconAlertTriangle />,
        }}
      >
        <Stack gap="md">
          <StoryNote>
            Press "Remove staff member". A confirmation modal appears, then navigates to a
            destination page with a flash message.
          </StoryNote>
          <FormStatus />
          <RegisteredUsername />
          <SubmitButton onCancel={() => {}} />
        </Stack>
      </Form>
    );
  },
};

/**
 * §3 Submit and navigate - no confirm modal, the form submits and
 * navigates to a destination page that picks up a flash message.
 */
export const SubmitAndNavigate: Story = {
  render: function SubmitAndNavigateStory() {
    const [page, setPage] = useState<"form" | "destination">("form");
    const [flash, setFlash] = useState<FlashPayload | null>(null);

    if (page === "destination") {
      return (
        <Stack gap="md">
          <InjectFlash flash={flash} />
          <StoryNote>Hazard log (simulated destination page)</StoryNote>
          <StoryNote>
            The flash message above was passed via React Router navigation state and rendered by
            the centralised PageMessage system.
          </StoryNote>
        </Stack>
      );
    }

    const handleSubmit = async (): Promise<FormSubmitResult> => {
      await delay(1500);
      setFlash({
        title: "Hazard saved",
        description: "The draft evidence has been recorded. This is not clinical approval.",
      });
      return { state: "success", message: { title: "" } };
    };

    return (
      <Form<HazardDraftValues>
        defaultValues={{
          title: "Delayed discharge summary",
          owner: "alex.morgan@example.com",
          reviewDate: "12/03/2026",
          evidence: "Review the recorded mitigation evidence before changing the assessment.",
        }}
        onSubmit={handleSubmit}
        onSuccess={() => setPage("destination")}
        submitLabel="Save hazard"
        submittingLabel="Saving…"
      >
        <Stack gap="md">
          <StoryNote>
            Press "Save hazard". This simulation shows feedback on the destination page.
          </StoryNote>
          <FormStatus />
          <RegisteredHazardTitle />
          <RegisteredOwner />
          <RegisteredReviewDate />
          <RegisteredEvidence />
          <SubmitButton onCancel={() => {}} cancelLabel="Back" />
        </Stack>
      </Form>
    );
  },
};

function RegisteredName() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextField label="Name" {...register("name")} />;
}

function RegisteredStaff() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const checked = watch("isStaff") as boolean;
  return (
    <SolidSwitch
      label="Staff"
      checked={checked}
      onChange={(e) => setValue("isStaff", e.currentTarget.checked, { shouldDirty: true })}
    />
  );
}

function RegisteredRole() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("role") as string | null;
  return (
    <SelectField
      label="Role"
      value={value}
      onChange={(v) => setValue("role", v as string, { shouldDirty: true })}
      data={[
        { value: "clinician", label: "Clinician" },
        { value: "admin", label: "Admin" },
        { value: "staff", label: "Staff" },
      ]}
    />
  );
}

function RegisteredPassword() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <PasswordField label="Password" {...register("password")} />;
}

function RegisteredNotes() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextAreaField label="Notes" {...register("notes")} />;
}

function RegisteredHazardTitle() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextField label="Hazard title" {...register("title")} />;
}

function RegisteredOwner() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextField label="Owner" {...register("owner")} />;
}

function RegisteredReviewDate() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextField label="Review date" {...register("reviewDate")} />;
}

function RegisteredEvidence() {
  const { methods } = useFormContext();
  const { register } = methods;
  return <TextAreaField label="Evidence" {...register("evidence")} minRows={6} />;
}

function RegisteredUser() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("user") as string | null;
  return (
    <SelectField
      label="User"
      value={value}
      onChange={(v) => setValue("user", v as string, { shouldDirty: true })}
      data={[
        { value: "Dr Smith", label: "Dr Smith" },
        { value: "Dr Jones", label: "Dr Jones" },
        { value: "Dr Patel", label: "Dr Patel" },
      ]}
    />
  );
}

function RegisteredPermissionLevel() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("level") as string | null;
  return (
    <SelectField
      label="Permission level"
      value={value}
      onChange={(v) => setValue("level", v as string, { shouldDirty: true })}
      data={[
        { value: "staff", label: "Staff" },
        { value: "clinician", label: "Clinician" },
        { value: "admin", label: "Admin" },
        { value: "superadmin", label: "Superadmin" },
      ]}
    />
  );
}

function RegisteredUsername() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("username") as string | null;
  return (
    <SelectField
      label="User"
      value={value}
      onChange={(v) => setValue("username", v as string, { shouldDirty: true })}
      data={[
        { value: "Dr Smith", label: "Dr Smith" },
        { value: "Dr Jones", label: "Dr Jones" },
        { value: "Dr Patel", label: "Dr Patel" },
      ]}
    />
  );
}

function RegisteredPriority() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("priority") as string | null;
  return (
    <RadioField
      label="Priority"
      value={value}
      onChange={(v) => setValue("priority", v, { shouldDirty: true })}
      options={[
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
      ]}
    />
  );
}

function RegisteredTags() {
  const { methods } = useFormContext();
  const { watch, setValue } = methods;
  const value = watch("tags") as string[];
  return (
    <MultiSelectField
      label="Tags"
      value={value}
      onChange={(v) => setValue("tags", v, { shouldDirty: true })}
      data={[
        { value: "urgent", label: "Urgent" },
        { value: "follow-up", label: "Follow-up" },
        { value: "review", label: "Review" },
      ]}
    />
  );
}

/** Email field wired to RHF validation - shows inline error for invalid email */
function ValidatedEmail() {
  const { methods } = useFormContext();
  const {
    register,
    formState: { errors },
  } = methods;
  return (
    <TextField
      label="Email"
      {...register("name", {
        required: "Email is required",
        pattern: {
          value: /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/,
          message: "Please enter a valid email address",
        },
      })}
      error={errors.name?.message as string | undefined}
    />
  );
}
