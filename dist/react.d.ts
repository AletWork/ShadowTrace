import React from "react";
import type { ShadowTraceProviderProps, UseShadowTraceHook } from "../types";
export declare function ShadowTraceProvider({ config, children, }: ShadowTraceProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useShadowTrace(): UseShadowTraceHook;
export declare function useComponentLifecycle(componentName: string): void;
export declare function useErrorTracking(componentName: string): void;
export declare function withShadowTrace<P extends object>(WrappedComponent: React.ComponentType<P>, componentName?: string): {
    (props: P): import("react/jsx-runtime").JSX.Element;
    displayName: string;
};
interface TrackClickProps {
    eventName: string;
    eventData?: any;
    children: React.ReactElement<any>;
}
export declare function TrackClick({ eventName, eventData, children, }: TrackClickProps): React.ReactElement<any, string | React.JSXElementConstructor<any>>;
interface TrackFormProps {
    formName: string;
    children: React.ReactElement<any, any>;
}
export declare function TrackForm({ formName, children }: TrackFormProps): React.FunctionComponentElement<any>;
export {};
