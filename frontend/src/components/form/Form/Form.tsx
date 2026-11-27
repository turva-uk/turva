/**
 * Form Component
 *
 * Wrapper that owns form submission state and exposes it via context.
 * Builds on React Hook Form and extends it with Turva-specific states
 * (partial_success, timeout) and composite outcome modelling.
 *
 * See Form.mdx for registered fields, API error handling and the opened-version
 * contract. This wrapper does not itself save evidence or approve a safety case.
 */

import {
  type ReactElement,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
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
  /**
   * Submit handler, sync or async: receives validated data, returns result.
   *
   * It is given no abort signal, on purpose. Cancelling a save only stops the
   * browser waiting; the server may still write. The form keeps the save
   * button held until this promise settles, so a second press cannot write
   * twice, and that only holds while the request runs to its real answer.
   */
  onSubmit: (data: T) => FormSubmitResult | Promise<FormSubmitResult>;
  /** Synchronous navigation after full success, only when no newer edits exist. */
  onSuccess?: (data: T) => void;
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
 * Dirty values and unresolved requests remain protected regardless of the
 * last status message. Only the explicit onSuccess callback may bypass it.
 */
function FormNavigationBlocker<T extends FieldValues>({
  control,
  onProceed,
  pending,
  allowNavigation,
  hasPendingOperation,
}: {
  control: Control<T>;
  onProceed: () => void;
  pending: boolean;
  allowNavigation: () => boolean;
  hasPendingOperation: () => boolean;
}) {
  const { isDirty } = useFormState({ control });

  const shouldBlock = isDirty || pending;

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      (shouldBlock || hasPendingOperation()) &&
      !allowNavigation() &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );

  return (
    <DirtyFormNavigation
      blocker={blocker}
      onProceed={onProceed}
      message={
        pending
          ? "A save is still in progress. Leaving does not cancel it, and any newer unsaved edits will be lost. Check the recorded version before submitting again. Leave this page?"
          : undefined
      }
    />
  );
}

/**
 * Conditionally renders FormNavigationBlocker only when inside a data router.
 * useBlocker requires a data router (createBrowserRouter/createMemoryRouter),
 * not just any router context (e.g. MemoryRouter).
 */
function MaybeFormNavigationBlocker<T extends FieldValues>(props: {
  control: Control<T>;
  onProceed: () => void;
  pending: boolean;
  allowNavigation: () => boolean;
  hasPendingOperation: () => boolean;
}) {
  const hasRouter = useInRouterContext();
  const dataRouterContext = useContext(UNSAFE_DataRouterContext);
  if (hasRouter && !dataRouterContext) {
    throw new Error(
      "Form navigation protection requires a data router (createBrowserRouter/createMemoryRouter).",
    );
  }
  if (!hasRouter) return null;
  return <FormNavigationBlocker {...props} />;
}

function NativeDepartureWarning<T extends FieldValues>({
  control,
  pending,
  hasPendingOperation,
  allowNavigation,
}: {
  control: Control<T>;
  pending: boolean;
  hasPendingOperation: () => boolean;
  allowNavigation: () => boolean;
}) {
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (allowNavigation() || (!isDirty && !pending && !hasPendingOperation())) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, pending, hasPendingOperation, allowNavigation]);
  return null;
}

/**
 * Form wrapper that owns submission state and provides it via context.
 */
export default function Form<T extends FieldValues>({
  defaultValues,
  onSubmit,
  onSuccess,
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
  // True from the moment a save is sent until its handler settles.
  const inFlightRef = useRef(false);
  const busyRef = useRef(false);
  const mountedRef = useRef(false);
  const revisionRef = useRef(0);
  const submittedRevisionRef = useRef(0);
  const navigationRef = useRef(false);
  const [submissionPending, setSubmissionPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const pendingDataRef = useRef<T | null>(null);

  useEffect(
    () =>
      methods.subscribe({
        formState: { values: true },
        callback: () => {
          revisionRef.current += 1;
        },
      }),
    [methods],
  );
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const allowNavigation = useCallback(() => navigationRef.current, []);
  const hasPendingOperation = useCallback(() => busyRef.current, []);

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
      setSubmissionPending(true);
      setStatusMessage(null);

      inFlightRef.current = true;

      // The timeout only says the outcome is unknown. It never cancels the
      // request, which the server may still be writing.
      let timedOut = false;
      const timeoutId = setTimeout(() => {
        timedOut = true;
        if (!mountedRef.current) return;
        setFormState("timeout");
        setStatusMessage({
          title: "Request timed out",
          description:
            "Turva has not confirmed the outcome. Your entries are still here. The request may have saved; wait for it to finish and check the recorded version before retrying.",
        });
      }, timeoutMs);

      try {
        const result = await onSubmit(data);

        clearTimeout(timeoutId);
        // A late answer cannot turn an uncertain outcome into a fresh save.
        if (!mountedRef.current || timedOut) return;
        const newerEdits = revisionRef.current !== submittedRevisionRef.current;
        setFormState(result.state);
        setStatusMessage(result.message);
        if (result.state === "success" || result.state === "partial_success") {
          const currentValues = methods.getValues();
          methods.reset(data, { keepValues: true });
          methods.reset(currentValues, { keepDefaultValues: true });
        }
        if (result.state === "success" && !newerEdits && onSuccess) {
          navigationRef.current = true;
          try {
            onSuccess(data);
          } catch {
            setFormState("partial_success");
            setStatusMessage({
              title: "Saved, but could not open the next page",
              description:
                "Your submitted entries were saved. You can navigate manually; do not resubmit them to open the page.",
            });
          } finally {
            navigationRef.current = false;
          }
        }
      } catch {
        clearTimeout(timeoutId);
        if (!mountedRef.current || timedOut) return;
        setFormState("error");
        setStatusMessage({
          title: "Something went wrong",
          description: "An unexpected error occurred. Please try again.",
        });
      } finally {
        clearTimeout(timeoutId);
        inFlightRef.current = false;
        busyRef.current = false;
        if (mountedRef.current) setSubmissionPending(false);
      }
    },
    [onSubmit, onSuccess, timeoutMs, methods],
  );

  const handleInvalid = useCallback((errors: FieldErrors<T>) => {
    busyRef.current = false;
    const count = Object.keys(errors).length;
    setFormState("validation_error");
    setStatusMessage({
      title: "Please check the highlighted fields",
      description: count === 1 ? "1 field needs attention." : `${count} fields need attention.`,
    });
  }, []);

  const handleValidated = useCallback(
    (data: T) => {
      if (!mountedRef.current) {
        busyRef.current = false;
        return;
      }
      if (confirm) {
        pendingDataRef.current = data;
        setConfirmOpen(true);
        setFormState("idle");
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
    // ConfirmModal's completion also calls this; never unlock an active write.
    if (!inFlightRef.current) busyRef.current = false;
  }, []);

  const contextValue: FormContextValue = {
    formState,
    statusMessage,
    dismissStatus,
    methods: methods as unknown as FormContextValue["methods"],
    submitLabel,
    submittingLabel,
    disableWhenClean,
    submissionPending,
  };

  return (
    <FormContext.Provider value={contextValue}>
      <FormProvider {...methods}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (busyRef.current) return;
            busyRef.current = true;
            submittedRevisionRef.current = revisionRef.current;
            setFormState("validating");
            void methods
              .handleSubmit(
                handleValidated,
                handleInvalid,
              )(event)
              .catch(() => {
                busyRef.current = false;
                if (!mountedRef.current) return;
                setFormState("error");
                setStatusMessage({
                  title: "Could not validate the form",
                  description: "Your entries are still here. Please try again.",
                });
              });
          }}
          noValidate
        >
          {children}
        </form>
        {blockNavigation && (
          <NativeDepartureWarning
            control={methods.control}
            pending={submissionPending || formState === "validating" || confirmOpen}
            hasPendingOperation={hasPendingOperation}
            allowNavigation={allowNavigation}
          />
        )}
        {blockNavigation && (
          <MaybeFormNavigationBlocker
            control={methods.control}
            onProceed={() => methods.reset()}
            pending={submissionPending || formState === "validating" || confirmOpen}
            allowNavigation={allowNavigation}
            hasPendingOperation={hasPendingOperation}
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
