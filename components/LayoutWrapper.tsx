
import React from 'react';

interface LayoutWrapperProps {
    children: React.ReactNode;
    className?: string;
    keyId?: string; // Change trigger for animations
}

export const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ children, className = "", keyId }) => {
    return (
        <div 
            key={keyId}
            className={`w-full h-full flex flex-col animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300 ease-out ${className}`}
        >
            {children}
        </div>
    );
};
