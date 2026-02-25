import { button } from "./button";

export const themeUI = {
  colors: {
    primary: "brand",
    secondary: "blue",
    success: "green",
    warning: "yellow",
    error: "red",
    neutral: "neutral",
  },

  //--------------------------------------------------------------------------------------------------
  slider: {
    slots: {
      root: "relative flex items-center select-none touch-none",
      track: "relative bg-accented overflow-hidden rounded-full grow",
      range: "absolute rounded-full",
      thumb:
        "rounded-full bg-default ring-2 focus-visible:outline-2 focus-visible:outline-offset-2",
    },
    variants: {
      color: {
        primary: {
          range: "bg-primary",
          thumb: "ring-primary focus-visible:outline-primary/50",
        },
        secondary: {
          range: "bg-secondary",
          thumb: "ring-secondary focus-visible:outline-secondary/50",
        },
        success: {
          range: "bg-success",
          thumb: "ring-success focus-visible:outline-success/50",
        },
        info: {
          range: "bg-info",
          thumb: "ring-info focus-visible:outline-info/50",
        },
        warning: {
          range: "bg-warning",
          thumb: "ring-warning focus-visible:outline-warning/50",
        },
        error: {
          range: "bg-error",
          thumb: "ring-error focus-visible:outline-error/50",
        },
        neutral: {
          range: "bg-inverted",
          thumb: "ring-inverted focus-visible:outline-inverted/50",
        },
      },
      size: {
        xs: {
          thumb: "size-2",
        },
        sm: {
          thumb: "size-3.5",
        },
        md: {
          thumb: "size-4",
        },
        lg: {
          thumb: "size-4.5",
        },
        xl: {
          thumb: "size-5",
        },
      },
      orientation: {
        horizontal: {
          root: "w-full",
          range: "h-full",
        },
        vertical: {
          root: "flex-col h-full",
          range: "w-full",
        },
      },
      disabled: {
        true: {
          root: "opacity-75 cursor-not-allowed",
        },
      },
    },
    compoundVariants: [
      {
        orientation: "horizontal",
        size: "xs",
        class: {
          track: "h-[4px]",
        },
      },
      {
        orientation: "horizontal",
        size: "sm",
        class: {
          track: "h-[7px]",
        },
      },
      {
        orientation: "horizontal",
        size: "md",
        class: {
          track: "h-[8px]",
        },
      },
      {
        orientation: "horizontal",
        size: "lg",
        class: {
          track: "h-[9px]",
        },
      },
      {
        orientation: "horizontal",
        size: "xl",
        class: {
          track: "h-[10px]",
        },
      },
      {
        orientation: "vertical",
        size: "xs",
        class: {
          track: "w-[6px]",
        },
      },
      {
        orientation: "vertical",
        size: "sm",
        class: {
          track: "w-[7px]",
        },
      },
      {
        orientation: "vertical",
        size: "md",
        class: {
          track: "w-[8px]",
        },
      },
      {
        orientation: "vertical",
        size: "lg",
        class: {
          track: "w-[9px]",
        },
      },
      {
        orientation: "vertical",
        size: "xl",
        class: {
          track: "w-[10px]",
        },
      },
    ],
    defaultVariants: {
      size: "md",
      color: "primary",
    },
  },
  //--------------------------------------------------------------------------------------------------
  modal: {
    slots: {
      overlay: "fixed inset-0",
      content:
        "bg-default divide-y divide-default flex flex-col focus:outline-none",
      header: "flex items-center gap-1.5 p-4 sm:px-6 min-h-16",
      wrapper: "",
      body: "flex-1 p-4 sm:p-4",
      footer: "flex items-center gap-1.5 p-4 sm:px-6",
      title: "text-highlighted font-semibold",
      description: "mt-1 text-muted text-sm",
      close: "absolute top-4 end-4",
    },
    variants: {
      transition: {
        true: {
          overlay:
            "data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_200ms_ease-in]",
          content:
            "data-[state=open]:animate-[scale-in_200ms_ease-out] data-[state=closed]:animate-[scale-out_200ms_ease-in]",
        },
      },
      fullscreen: {
        true: {
          content: "inset-0",
        },
        false: {
          content:
            "w-[calc(100vw-2rem)] max-w-3xl rounded-lg shadow-lg ring ring-transparent",
        },
      },
      overlay: {
        true: {
          overlay: "bg-elevated/75",
        },
      },
      scrollable: {
        true: {
          overlay: "overflow-y-auto",
          content: "relative",
        },
        false: {
          content: "fixed",
          body: "overflow-y-auto",
        },
      },
    },
    compoundVariants: [
      {
        scrollable: true,
        fullscreen: false,
        class: {
          overlay: "grid place-items-center p-4 sm:py-8",
        },
      },
      {
        scrollable: false,
        fullscreen: false,
        class: {
          content:
            "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-4rem)] overflow-hidden",
        },
      },
    ],
  },

  input: {
    slots: {
      root: "relative inline-flex items-center",
      base: [
        "w-full rounded-md border-0 appearance-none placeholder:text-dimmed focus:outline-none disabled:cursor-not-allowed disabled:opacity-75",
        "transition-colors",
      ],
      leading: "absolute inset-y-0 start-0 flex items-center",
      leadingIcon: "shrink-0 text-dimmed",
      leadingAvatar: "shrink-0",
      leadingAvatarSize: "",
      trailing: "absolute inset-y-0 end-0 flex items-center",
      trailingIcon: "shrink-0 text-dimmed",
    },
    variants: {
      fieldGroup: {
        horizontal: {
          root: "group has-focus-visible:z-[1]",
          base: "group-not-only:group-first:rounded-e-none group-not-only:group-last:rounded-s-none group-not-last:group-not-first:rounded-none",
        },
        vertical: {
          root: "group has-focus-visible:z-[1]",
          base: "group-not-only:group-first:rounded-b-none group-not-only:group-last:rounded-t-none group-not-last:group-not-first:rounded-none",
        },
      },
      size: {
        xs: {
          base: "px-2 py-1 text-xs gap-1",
          leading: "ps-2",
          trailing: "pe-2",
          leadingIcon: "size-4",
          leadingAvatarSize: "3xs",
          trailingIcon: "size-4",
        },
        sm: {
          base: "px-2.5 py-1.5 text-xs gap-1.5",
          leading: "ps-2.5",
          trailing: "pe-2.5",
          leadingIcon: "size-4",
          leadingAvatarSize: "3xs",
          trailingIcon: "size-4",
        },
        md: {
          base: "px-2.5 py-1.5 text-sm gap-1.5",
          leading: "ps-2.5",
          trailing: "pe-2.5",
          leadingIcon: "size-5",
          leadingAvatarSize: "2xs",
          trailingIcon: "size-5",
        },
        lg: {
          base: "px-3 py-2 text-sm gap-2",
          leading: "ps-3",
          trailing: "pe-3",
          leadingIcon: "size-5",
          leadingAvatarSize: "2xs",
          trailingIcon: "size-5",
        },
        xl: {
          base: "px-3 py-2 text-base gap-2",
          leading: "ps-3",
          trailing: "pe-3",
          leadingIcon: "size-6",
          leadingAvatarSize: "xs",
          trailingIcon: "size-6",
        },
      },
      variant: {
        outline: "text-highlighted bg-default ring ring-inset ring-default",
        soft: "text-highlighted bg-elevated/50 hover:bg-elevated focus:bg-elevated disabled:bg-elevated/50",
        subtle: "text-highlighted bg-elevated ring ring-inset ring-accented",
        ghost:
          "text-highlighted bg-transparent hover:bg-elevated focus:bg-elevated disabled:bg-transparent dark:disabled:bg-transparent",
        none: "text-highlighted bg-transparent",
      },
      color: {
        primary: "",
        secondary: "",
        success: "",
        info: "",
        warning: "",
        error: "",
        neutral: "",
      },
      leading: {
        true: "",
      },
      trailing: {
        true: "",
      },
      loading: {
        true: "",
      },
      highlight: {
        true: "",
      },
      type: {
        file: "file:me-1.5 file:font-medium file:text-muted file:outline-none",
      },
    },
    compoundVariants: [
      {
        color: "primary",
        variant: ["outline", "subtle"],
        class:
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
      },
      {
        color: "primary",
        highlight: true,
        class: "ring ring-inset ring-primary",
      },
      {
        color: "neutral",
        variant: ["outline", "subtle"],
        class:
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-inverted",
      },
      {
        color: "neutral",
        highlight: true,
        class: "ring ring-inset ring-inverted",
      },
      {
        leading: true,
        size: "xs",
        class: "ps-7",
      },
      {
        leading: true,
        size: "sm",
        class: "ps-8",
      },
      {
        leading: true,
        size: "md",
        class: "ps-9",
      },
      {
        leading: true,
        size: "lg",
        class: "ps-10",
      },
      {
        leading: true,
        size: "xl",
        class: "ps-11",
      },
      {
        trailing: true,
        size: "xs",
        class: "pe-7",
      },
      {
        trailing: true,
        size: "sm",
        class: "pe-8",
      },
      {
        trailing: true,
        size: "md",
        class: "pe-9",
      },
      {
        trailing: true,
        size: "lg",
        class: "pe-10",
      },
      {
        trailing: true,
        size: "xl",
        class: "pe-11",
      },
      {
        loading: true,
        leading: true,
        class: {
          leadingIcon: "animate-spin",
        },
      },
      {
        loading: true,
        leading: false,
        trailing: true,
        class: {
          trailingIcon: "animate-spin",
        },
      },
    ],
    defaultVariants: {
      size: "md",
      color: "primary",
      variant: "outline",
    },
  },

  button,
};
