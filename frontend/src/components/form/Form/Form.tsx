/**
 * Form Component
 *
 * Wrapper that owns form submission state and exposes it via context.
 * Builds on React Hook Form and extends it with Turva-specific states
 * (partial_success, timeout) and composite outcome modelling.
 *
 * @example
 * ```tsx
 * <Form
 *   onSubmit={async (data) => {
 *     await api.put("/settings", data);
 *     return { state: "success", message: { title: "Saved" } };
 *   }}
 *   submitLabel="Save"
 *   submittingLabel="Saving…"
 * >
 *   <FormStatus />
 *   <TextField {...} />
 *   <SubmitButton />
 * </Form>
 * ```
 */

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  useForm,
  FormProvider,
  useFormState,
  type DefaultValues,
  type FieldValues,
  type FieldErrors,
  type Control,
} from "react-hook-form";
import { useBlocker, useInRouterContext, UNSAFE_DataRouterContext } from "react-router";
import FormContext, {
  type FormState,
  type FormStatusMessage,
  type FormContextValue,
} from "./FormContext";
import ConfirmModal from "@/components/confirm-modal/ConfirmModal";
import DirtyFormNavigation from "@/components/warnings";

export interface FormSubmitResult {
  /** Resulting state after submission */
  state: "success" | "partial_success" | "error" | "validation_error";
  /** Status message to display */
  message: FormStatusMessage;
}

export interface FormConfirmConfig {
  /** Bold centred heading in the modal */
  title?: string;
  /** Message body */
  children: ReactNode;
  /** Red action button label (defaults to "Confirm") */
  acceptLabel?: string;
  /** Label shown during submission (defaults to "Confirming…") */
  submittingLabel?: string;
  /** Outline button label (defaults to "Cancel") */
  cancelLabel?: string;
  /** Centred icon above title/message */
  icon?: ReactElement;
}

export interface FormProps<T extends FieldValues> {
  /** Default form values */
  defaultValues?: DefaultValues<T>;
  /** Submit handler, sync or async: receives validated data, returns result */
  onSubmit: (data: T) => FormSubmitResult | Promise<FormSubmitResult>;
  /** Label for the submit button (defaults to "Save") */
  submitLabel?: string;
  /** Label shown during submission (defaults to "Saving…") */
  submittingLabel?: string;
  /** Timeout in milliseconds - triggers timeout state (defaults to 30000) */
  timeoutMs?: number;
  /** When true, submit button is disabled until the form is dirty (defaults to false) */
  disableWhenClean?: boolean;
  /** When provided, a confirmation modal gates submission after validation passes */
  confirm?: FormConfirmConfig;
  /** Block navigation when form is dirty (defaults to true) */
  blockNavigation?: boolean;
  /** Form content (FormStatus, fields, SubmitButton) */
  children: ReactNode;
}

/**
 * Internal component that blocks navigation when the form is dirty.
 * Must be rendered inside FormProvider to access form state.
 * Only activates when rendered inside a React Router context.
 * Does NOT block during submission or after success (the onSubmit
 * handler may navigate before Form calls reset).
 */
function FormNavigationBlocker<T extends FieldValues>({
  control,
  onProceed,
  formState,
}: {
  control: Control<T>;
  onProceed: () => void;
  formState: FormState;
}) {
  const { isDirty } = useFormState({ control });

  const shouldBlock =
    isDirty &&
    formState !== "submitting" &&
    formState !== "success" &&
    formState !== "partial_success";

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      shouldBlock && currentLocation.pathname !== nextLocation.pathname,
  );

  return <DirtyFormNavigation blocker={blocker} onProceed={onProceed} />;
}

/**
 * Conditionally renders FormNavigationBlocker only when inside a data router.
 * useBlocker requires a data router (createBrowserRouter/createMemoryRouter),
 * not just any router context (e.g. MemoryRouter).
 */
function MaybeFormNavigationBlocker<T extends FieldValues>(props: {
  control: Control<T>;
  onProceed: () => void;
  formState: FormState;
}) {
  const hasRouter = useInRouterContext();
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  if (!hasRouter || !dataRouterContext) return null;
  return <FormNavigationBlocker {...props} />;
}

/**
 * Form wrapper that owns submission state and provides it via context.
 */
export default function Form<T extends FieldValues>({
  defaultValues,
  onSubmit,
  submitLabel = "Save",
  submittingLabel = "Saving\u2026",
  timeoutMs = 30_000,
  disableWhenClean = false,
  confirm,
  blockNavigation = true,
  children,
}: FormProps<T>) {
  const methods = useForm<T>({ defaultValues, mode: "onChange" });
  const [formState, setFormState] = useState<FormState>("idle");
  const [statusMessage, setStatusMessage] = useState<FormStatusMessage | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingDataRef = useRef<T | null>(null);

  const dismissStatus = useCallback(() => {
    setStatusMessage(null);
    if (
      formState === "success" ||
      formState === "error" ||
      formState === "partial_success" ||
      formState === "validation_error" ||
      formState === "timeout"
    ) {
      setFormState("idle");
    }
  }, [formState]);

  const handleSubmit = useCallback(
    async (data: T) => {
      setFormState("submitting");
      setStatusMessage(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeoutMs);

      try {
        const result = await Promise.race([
          onSubmit(data),
          new Promise<never>((_, reject) => {
            controller.signal.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          }),
        ]);

        clearTimeout(timeoutId);
        setFormState(result.state);
        setStatusMessage(result.message);
        if (result.state === "success" || result.state === "partial_success") {
          methods.reset(data);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof DOMException && err.name === "AbortError") {
          setFormState("timeout");
          setStatusMessage({
            title: "Request timed out",
            description:
              "The server did not respond in time. Your changes may not have been saved.",
          });
        } else {
          setFormState("error");
          setStatusMessage({
            title: "Something went wrong",
            description: "An unexpected error occurred. Please try again.",
          });
        }
      } finally {
        abortRef.current = null;
      }
    },
    [onSubmit, timeoutMs, methods],
  );

  const handleInvalid = useCallback((errors: FieldErrors<T>) => {
    const count = Object.keys(errors).length;
    setFormState("validation_error");
    setStatusMessage({
      title: "Please check the highlighted fields",
      description: count === 1 ? "1 field needs attention." : `${count} fields need attention.`,
    });
  }, []);

  const handleValidated = useCallback(
    (data: T) => {
      if (confirm) {
        pendingDataRef.current = data;
        setConfirmOpen(true);
      } else {
        void handleSubmit(data);
      }
    },
    [confirm, handleSubmit],
  );

  const handleConfirmAccept = useCallback(async () => {
    setConfirmOpen(false);
    if (pendingDataRef.current) {
      await handleSubmit(pendingDataRef.current);
      pendingDataRef.current = null;
    }
  }, [handleSubmit]);

  const handleConfirmClose = useCallback(() => {
    setConfirmOpen(false);
    pendingDataRef.current = null;
  }, []);

  const contextValue: FormContextValue = {
    formState,
    statusMessage,
    dismissStatus,
    methods: methods as unknown as FormContextValue["methods"],
    submitLabel,
    submittingLabel,
    disableWhenClean,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <FormProvider {...methods}>
        <form
          /*
            eslint-disable-next-line react-hooks/refs -- `handleSubmit`
            registers the callback rather than calling it: `handleValidated`
            runs on submit, and the ref it writes is never touched during
            render. The rule analyses one function at a time and cannot see
            the deferral.
          */
          onSubmit={methods.handleSubmit(handleValidated, handleInvalid)}
          noValidate
        >
          {children}
        </form>
        {blockNavigation && (
          <MaybeFormNavigationBlocker
            control={methods.control}
            onProceed={() => methods.reset()}
            formState={formState}
          />
        )}
        {confirm && (
          <ConfirmModal
            opened={confirmOpen}
            onClose={handleConfirmClose}
            onAccept={handleConfirmAccept}
            title={confirm.title}
            acceptLabel={confirm.acceptLabel}
            submittingLabel={confirm.submittingLabel}
            cancelLabel={confirm.cancelLabel}
            icon={confirm.icon}
          >
            {confirm.children}
          </ConfirmModal>
        )}
      </FormProvider>
    </FormContext.Provider>
  );
}
