"use client";

export type EditMode = "ai" | "manual";
export type InitialComposeStatus = "idle" | "loading" | "error";

export interface BodyStepState {
  showPreview: boolean;
  showRefinementThread: boolean;
  refineText: string;
  editMode: EditMode;
  bodyText: string;
  userEdited: boolean;
  showFirstDraftReadyDialog: boolean;
  isComposerFocused: boolean;
  isManualFieldFocused: boolean;
  isAutoComposing: boolean;
  initialComposeStatus: InitialComposeStatus;
}

export type BodyStepAction =
  | {
      type: "hydrate";
      bodyText: string;
      refineText: string;
    }
  | {
      type: "set-body-text";
      value: string;
      userEdited?: boolean;
    }
  | {
      type: "set-refine-text";
      value: string;
    }
  | {
      type: "append-refine-text";
      value: string;
    }
  | {
      type: "set-user-edited";
      value: boolean;
    }
  | {
      type: "set-edit-mode";
      value: EditMode;
    }
  | {
      type: "set-show-preview";
      value: boolean;
    }
  | {
      type: "toggle-refinement-thread";
    }
  | {
      type: "set-show-first-draft-ready-dialog";
      value: boolean;
    }
  | {
      type: "set-composer-focused";
      value: boolean;
    }
  | {
      type: "set-manual-field-focused";
      value: boolean;
    }
  | {
      type: "start-auto-compose";
    }
  | {
      type: "finish-auto-compose";
    }
  | {
      type: "fail-auto-compose";
    };

export const initialBodyStepState: BodyStepState = {
  showPreview: false,
  showRefinementThread: false,
  refineText: "",
  editMode: "ai",
  bodyText: "",
  userEdited: false,
  showFirstDraftReadyDialog: false,
  isComposerFocused: false,
  isManualFieldFocused: false,
  isAutoComposing: false,
  initialComposeStatus: "idle",
};

export function bodyStepReducer(
  state: BodyStepState,
  action: BodyStepAction,
): BodyStepState {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        bodyText: action.bodyText,
        refineText: action.refineText,
      };
    case "set-body-text":
      return {
        ...state,
        bodyText: action.value,
        userEdited: action.userEdited ?? state.userEdited,
      };
    case "set-refine-text":
      return {
        ...state,
        refineText: action.value,
      };
    case "append-refine-text":
      return {
        ...state,
        refineText: `${state.refineText.trim()}${state.refineText.trim() ? " " : ""}${action.value}`,
      };
    case "set-user-edited":
      return {
        ...state,
        userEdited: action.value,
      };
    case "set-edit-mode":
      return {
        ...state,
        editMode: action.value,
      };
    case "set-show-preview":
      return {
        ...state,
        showPreview: action.value,
      };
    case "toggle-refinement-thread":
      return {
        ...state,
        showRefinementThread: !state.showRefinementThread,
      };
    case "set-show-first-draft-ready-dialog":
      return {
        ...state,
        showFirstDraftReadyDialog: action.value,
      };
    case "set-composer-focused":
      return {
        ...state,
        isComposerFocused: action.value,
      };
    case "set-manual-field-focused":
      return {
        ...state,
        isManualFieldFocused: action.value,
      };
    case "start-auto-compose":
      return {
        ...state,
        isAutoComposing: true,
        initialComposeStatus: "loading",
      };
    case "finish-auto-compose":
      return {
        ...state,
        isAutoComposing: false,
        initialComposeStatus: "idle",
      };
    case "fail-auto-compose":
      return {
        ...state,
        isAutoComposing: false,
        initialComposeStatus: "error",
      };
  }
}
