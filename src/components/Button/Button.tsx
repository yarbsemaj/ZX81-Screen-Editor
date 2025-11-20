import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
  className?: string;
};

const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  ...props
}) => (
  <button
    className={`
        px-6 py-2
        bg-white text-black
        border-2 border-black
        font-mono text-lg
        shadow-[4px_4px_0_0_#000000]
        hover:bg-black hover:text-white
        active:shadow-none
        active:translate-x-1 active:translate-y-1
        transition-all duration-200
        disabled:opacity-50 disabled:shadow-none 
        disabled:cursor-not-allowed disabled:pointer-events-none 
        disabled:translate-1
        ${className}
        `}
    {...props}
  >
    {children}
  </button>
);

export default Button;
