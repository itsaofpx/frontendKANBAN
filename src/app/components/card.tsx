import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string; // Allow dynamic padding
  backgroundColor?: string; // Allow dynamic background color
}

export function Card({ children, className, padding = "px-[4rem] py-[2rem]", backgroundColor = "bg-white" }: CardProps) {
  return (
    <div
      className={`${padding} ${backgroundColor} text-black font-bold text-2xl shadow-md rounded-lg ${className}`}
      role="region"
      aria-labelledby="card"
    >
      {children}
    </div>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string; // Allow customization of content
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}


