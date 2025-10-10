import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

const Breadcrumbs = ({ items, className = "" }: BreadcrumbsProps) => {
  return (
    <nav
      className={`flex items-center space-x-1 text-sm text-text-muted ${className}`}
    >
      <Link
        to="/"
        className="flex items-center hover:text-primary transition-colors duration-200"
      >
        <Home className="w-4 h-4" />
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="w-4 h-4" />
          {item.href && !item.current ? (
            <Link
              to={item.href}
              className="hover:text-primary transition-colors duration-200"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={item.current ? "text-text-primary font-medium" : ""}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
};

export { Breadcrumbs };
