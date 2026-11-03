import React, { createContext, useContext, useState, useId, useEffect } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { cn } from "@/lib/utils";

const DisclosureContext = createContext(undefined);

export function DisclosureProvider({
  children,
  open: openProp,
  onOpenChange,
  variants,
}) {
  const [internalOpenValue, setInternalOpenValue] = useState(openProp);

  useEffect(() => {
    setInternalOpenValue(openProp);
  }, [openProp]);

  const toggle = () => {
    const newOpen = !internalOpenValue;
    setInternalOpenValue(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  return (
    <DisclosureContext.Provider
      value={{
        open: internalOpenValue,
        toggle,
        variants,
      }}
    >
      {children}
    </DisclosureContext.Provider>
  );
}

export function useDisclosure() {
  const context = useContext(DisclosureContext);
  if (!context) {
    throw new Error("useDisclosure must be used within a DisclosureProvider");
  }
  return context;
}

export function Disclosure({
  open: openProp = false,
  onOpenChange,
  children,
  className,
  transition = { duration: 0.2, ease: "easeOut" },
  variants,
}) {
  return (
    <MotionConfig transition={transition}>
      <div className={className}>
        <DisclosureProvider
          open={openProp}
          onOpenChange={onOpenChange}
          variants={variants}
        >
          {React.Children.toArray(children)[0]}
          {React.Children.toArray(children)[1]}
        </DisclosureProvider>
      </div>
    </MotionConfig>
  );
}

export function DisclosureTrigger({ children, className }) {
  const { toggle, open } = useDisclosure();

  return (
    <>
      {React.Children.map(children, (child) => {
        return React.isValidElement(child)
          ? React.cloneElement(child, {
              onClick: (e) => {
                if (child.props.onClick) child.props.onClick(e);
                toggle();
              },
              role: "button",
              "aria-expanded": open,
              tabIndex: 0,
              onKeyDown: (e) => {
                if (child.props.onKeyDown) child.props.onKeyDown(e);
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggle();
                }
              },
              className: cn(className, child.props.className),
            })
          : child;
      })}
    </>
  );
}

export function DisclosureContent({ children, className }) {
  const { open, variants } = useDisclosure();
  const uniqueId = useId();

  const BASE_VARIANTS = {
    expanded: {
      height: "auto",
      opacity: 1,
    },
    collapsed: {
      height: 0,
      opacity: 0,
    },
  };

  const combinedVariants = {
    expanded: { ...BASE_VARIANTS.expanded, ...variants?.expanded },
    collapsed: { ...BASE_VARIANTS.collapsed, ...variants?.collapsed },
  };

  return (
    <div className={cn("overflow-hidden", className)}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={uniqueId}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={combinedVariants}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
