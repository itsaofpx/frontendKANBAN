import { ReactNode, MouseEvent } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export function Button({ children, onClick, className }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`bg-blue-500 text-white font-normal text-lg px-4 py-2 rounded-md hover:bg-blue-600 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}